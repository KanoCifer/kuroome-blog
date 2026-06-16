"""GitHub OAuth authentication service."""

from __future__ import annotations

import secrets
from urllib.parse import urlencode

import httpx2
from fastapi import Request

from app.core.config import settings
from app.core.exceptions import GitHubAuthError
from app.core.logger import logger
from app.core.security import generate_pkce_pair
from app.models.models import User
from app.services.user.core import UserService


class GitHubAuthService:
    """GitHub OAuth authentication flows."""

    def __init__(self, user_service: UserService) -> None:
        self.user_service = user_service
        self.repo = user_service.repo

    def generate_oauth_url(
        self, *, mode: str = "login"
    ) -> tuple[str, str, str, str]:
        """Generate GitHub OAuth URL with PKCE challenge.

        Returns (auth_url, state, code_verifier, mode).
        """
        state = secrets.token_urlsafe(32)
        code_verifier, code_challenge = generate_pkce_pair()

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "state": state,
            "scope": "read:user user:email",
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        auth_url = "https://github.com/login/oauth/authorize?" + urlencode(
            params
        )
        return auth_url, state, code_verifier, mode

    async def find_or_create_github_user(
        self,
        github_id: int,
        username: str,
        email: str,
        avatar_url: str | None = None,
    ) -> User:
        """Find existing GitHub user or create new account.

        Appends random suffix if username conflicts.
        """
        user = await self.repo.get_by_github_id(github_id)
        if user:
            return user

        if await self.repo.is_username_taken(username):
            username = f"{username}_{secrets.token_urlsafe(4)}"

        user = await self.repo.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            name=username,
            github_id=github_id,
        )
        await self.repo.create_profile(
            user_id=user.id, email=email, photo=avatar_url or "default.png"
        )
        await self.repo.refresh_user(user)
        return user

    async def bind_github(
        self,
        user: User,
        github_id: int,
        avatar_url: str | None,
    ) -> str:
        """Link GitHub account to user.

        Returns "success" or "github_already_bound" if taken.
        """
        existing = await self.repo.get_by_github_id(github_id)
        if existing and existing.id != user.id:
            return "github_already_bound"

        await self.repo.set_github_id(user, github_id)
        profile = await self.repo.get_profile(user.id)
        if profile and not profile.photo:
            await self.repo.update_profile(profile, photo=avatar_url)
        return "success"

    async def unbind_github(self, user: User) -> None:
        """Remove GitHub account linkage from user."""
        await self.repo.set_github_id(user, None)

    async def handle_github_login_callback(
        self,
        github_id: int,
        username: str,
        email: str,
        avatar_url: str | None,
        request: Request,
    ) -> User:
        """Handle GitHub OAuth callback, linking by email if possible.

        Prefers linking to existing non-GitHub account with matching email.
        """
        existing_by_email = None
        if email and not email.endswith("@github.com"):
            existing_by_email = await self.repo.get_by_email(email)

        if existing_by_email and not existing_by_email.github_id:
            await self.repo.set_github_id(existing_by_email, github_id)
            profile = existing_by_email.profile
            if profile and not profile.photo:
                await self.repo.update_profile(profile, photo=avatar_url)
            user = existing_by_email
        else:
            user = await self.find_or_create_github_user(
                github_id, username, email, avatar_url
            )

        await self.user_service.record_login(user, request)
        return user

    async def exchange_github_code(self, code: str, code_verifier: str) -> str:
        """Exchange GitHub OAuth code for an access token.

        Raises GitHubAuthError on any failure (timeout, HTTP error, network error).
        """
        try:
            async with httpx2.AsyncClient() as client:
                token_resp = await client.post(
                    "https://github.com/login/oauth/access_token",
                    json={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.GITHUB_REDIRECT_URI,
                        "code_verifier": code_verifier,
                    },
                    headers={"Accept": "application/json"},
                    timeout=httpx2.Timeout(
                        connect=10.0, read=30.0, write=10.0, pool=5.0
                    ),
                    follow_redirects=True,
                )
                token_resp.raise_for_status()
                token_data = token_resp.json()
        except (
            httpx2.ReadTimeout,
            httpx2.ConnectTimeout,
            httpx2.PoolTimeout,
        ) as e:
            raise GitHubAuthError("github_timeout") from e
        except httpx2.HTTPStatusError as e:
            logger.error(f"GitHub token exchange failed: {e.response.text}")
            raise GitHubAuthError("github_auth_failed") from e
        except httpx2.NetworkError as e:
            logger.error(f"GitHub network error: {e!s}")
            raise GitHubAuthError("github_network_error") from e
        except ValueError as e:
            logger.error(f"GitHub token JSON parse failed: {e!s}")
            raise GitHubAuthError("github_invalid_response") from e

        if "error" in token_data:
            error_msg = token_data.get(
                "error_description", "github_auth_failed"
            )
            raise GitHubAuthError(error_msg)

        return token_data["access_token"]

    async def fetch_github_user_info(self, access_token: str) -> dict:
        """Fetch GitHub user profile with the given access token.

        Raises GitHubAuthError on any failure.
        """
        try:
            async with httpx2.AsyncClient() as client:
                user_resp = await client.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=httpx2.Timeout(
                        connect=10.0, read=30.0, write=10.0, pool=5.0
                    ),
                    follow_redirects=True,
                )
                user_resp.raise_for_status()
                return user_resp.json()
        except (
            httpx2.ReadTimeout,
            httpx2.ConnectTimeout,
            httpx2.PoolTimeout,
        ) as e:
            raise GitHubAuthError("github_timeout") from e
        except httpx2.HTTPStatusError as e:
            logger.error(f"GitHub user info failed: {e.response.text}")
            raise GitHubAuthError("github_user_info_failed") from e
        except httpx2.NetworkError as e:
            logger.error(f"GitHub network error: {e!s}")
            raise GitHubAuthError("github_network_error") from e
        except ValueError as e:
            logger.error(f"GitHub user info JSON parse failed: {e!s}")
            raise GitHubAuthError("github_invalid_response") from e
