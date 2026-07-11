"""Tests for the blog tag migration (Category → Tags).

Covers:
- BlogService.list_tags / get_posts_by_tag (tag aggregation + filtering)
- AdminService.add_post / update_post (payload shape: tags: list[str])
- BlogService._clean_tags (dedup / strip / truncate)
- API endpoints: GET /v1/tags, GET /v1/tags/{tag}/posts,
  POST /v1/admin/post/add, PUT /v1/admin/post/update

MongoDB is used directly — Post is a Beanie document, so we initialise
beanie against the configured MONGO_URI (same DB as dev, but tests only
operate on documents they create and delete).
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import pytest_asyncio
from bson import ObjectId

from app.models.blog import Post
from app.repositories.admin_repo import AdminRepo
from app.repositories.blog_repo import BlogRepo
from app.services.admin_service import AdminService
from app.services.blog_service import BlogService

pytestmark = pytest.mark.asyncio(loop_scope="session")


def _mongo_available() -> bool:
    """Check whether a usable MongoDB is configured."""
    from urllib.parse import urlparse

    from app.core.config import get_settings

    settings = get_settings()
    if not settings.MONGO_URI:
        return False
    # Ensure the URI contains a database name (get_default_database needs it)
    parsed = urlparse(settings.MONGO_URI)
    return bool(parsed.path and parsed.path.strip("/"))


@pytest_asyncio.fixture(scope="session")
async def mongo_init():
    """Initialise beanie once against the configured MongoDB.

    Yields the MongoClient (or None if Mongo is unavailable) so
    downstream fixtures/tests can decide whether to proceed.
    """
    if not _mongo_available():
        yield None
        return

    from beanie import init_beanie
    from pymongo import AsyncMongoClient

    from app.core.config import get_settings

    settings = get_settings()
    client = AsyncMongoClient(settings.MONGO_URI)
    db = client.get_default_database()
    await init_beanie(database=db, document_models=[Post])
    yield client
    await client.close()


@pytest_asyncio.fixture(autouse=True)
async def _clean_posts(mongo_init):
    """Remove any Post docs created by prior tests (only when Mongo is up)."""
    yield
    if mongo_init is not None:
        await Post.find_all().delete()


@pytest_asyncio.fixture
async def blog_service(mongo_init):
    if mongo_init is None:
        pytest.skip("MongoDB unavailable")
    return BlogService(BlogRepo())


@pytest_asyncio.fixture
async def admin_service(mongo_init):
    """AdminService with a no-op cache.clear and no auth."""
    if mongo_init is None:
        pytest.skip("MongoDB unavailable")
    return AdminService(AdminRepo(), cache=_NoOpCache())


class _NoOpCache:
    async def clear(self) -> None:
        pass


def _make_post(**overrides) -> Post:
    """Build a Post with sensible defaults + overrides."""
    defaults = {
        "title": "Test Post",
        "body": "Test body",
        "summary": None,
        "cover": None,
        "tags": [],
        "is_pinned": 0,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    return Post(**defaults)


# ─────────────────────────────────────────────────────────────────
# BlogService._clean_tags
# ─────────────────────────────────────────────────────────────────


class TestCleanTags:
    """No MongoDB needed — pure function test."""

    def test_strips_whitespace(self):
        assert BlogService._clean_tags(["  foo  ", "bar "]) == ["foo", "bar"]

    def test_dedupes(self):
        assert BlogService._clean_tags(["a", "a", "b"]) == ["a", "b"]

    def test_drops_empties(self):
        assert BlogService._clean_tags(["", "  ", "x"]) == ["x"]

    def test_truncates_to_50_chars(self):
        long = "a" * 100
        result = BlogService._clean_tags([long])
        assert len(result[0]) == 50

    def test_handles_none(self):
        assert BlogService._clean_tags(None) == []

    def test_handles_empty_list(self):
        assert BlogService._clean_tags([]) == []


# ─────────────────────────────────────────────────────────────────
# BlogService.list_tags (aggregation)
# ─────────────────────────────────────────────────────────────────


class TestListTags:
    async def test_empty_when_no_posts(self, blog_service):
        tags = await blog_service.list_tags()
        assert tags == []

    async def test_aggregates_tag_counts(self, blog_service):
        await _make_post(tags=["python", "fastapi"]).insert()
        await _make_post(tags=["python"]).insert()
        await _make_post(tags=["mongodb", "fastapi"]).insert()

        tags = await blog_service.list_tags()
        by_name = {t["name"]: t["count"] for t in tags}

        assert by_name == {"python": 2, "fastapi": 2, "mongodb": 1}

    async def test_sorted_by_count_desc_then_name_asc(self, blog_service):
        await _make_post(tags=["b"]).insert()
        await _make_post(tags=["c"]).insert()
        await _make_post(tags=["a"]).insert()
        await _make_post(tags=["b"]).insert()  # b:2, a:1, c:1

        tags = await blog_service.list_tags()
        assert [t["name"] for t in tags] == ["b", "a", "c"]

    async def test_ignores_posts_with_no_tags(self, blog_service):
        await _make_post(tags=["x"]).insert()
        await _make_post(tags=[]).insert()

        tags = await blog_service.list_tags()
        assert len(tags) == 1
        assert tags[0] == {"name": "x", "count": 1}


# ─────────────────────────────────────────────────────────────────
# BlogService.get_posts_by_tag
# ─────────────────────────────────────────────────────────────────


class TestGetPostsByTag:
    async def test_filters_by_single_tag(self, blog_service):
        p1 = await _make_post(title="A", tags=["python"]).insert()
        await _make_post(title="B", tags=["go"]).insert()
        p3 = await _make_post(title="C", tags=["python", "fastapi"]).insert()

        result = await blog_service.get_posts_by_tag("python")

        assert result["tag"] == "python"
        assert result["total"] == 2
        returned_ids = {p["_id"] for p in result["posts"]}
        assert returned_ids == {str(p1.id), str(p3.id)}

    async def test_returns_empty_for_nonexistent_tag(self, blog_service):
        await _make_post(tags=["x"]).insert()

        result = await blog_service.get_posts_by_tag("missing")

        assert result == {"posts": [], "tag": "missing", "total": 0}

    async def test_requires_tag_arg(self, blog_service):
        from app.core.exceptions import BlogDomainError

        with pytest.raises(BlogDomainError):
            await blog_service.get_posts_by_tag("  ")

    async def test_pagination(self, blog_service):
        for _ in range(15):
            await _make_post(tags=["p"]).insert()

        page1 = await blog_service.get_posts_by_tag("p", page=1, per_page=10)
        page2 = await blog_service.get_posts_by_tag("p", page=2, per_page=10)

        assert page1["total"] == 15
        assert len(page1["posts"]) == 10
        assert len(page2["posts"]) == 5


# ─────────────────────────────────────────────────────────────────
# BlogService.get_blogs (response shape — tags, not categories)
# ─────────────────────────────────────────────────────────────────


class TestGetBlogs:
    async def test_response_contains_tags_not_categories(self, blog_service):
        await _make_post(tags=["vue"]).insert()

        result = await blog_service.get_blogs(page=1, search=None)

        assert "tags" in result
        assert "categories" not in result
        assert result["tags"] == [{"name": "vue", "count": 1}]

    async def test_post_object_includes_tags_field(self, blog_service):
        await _make_post(tags=["a", "b"]).insert()

        result = await blog_service.get_blogs(page=1, search=None)

        assert len(result["posts"]) == 1
        assert result["posts"][0]["tags"] == ["a", "b"]
        # Response must no longer carry category_id / category
        assert "category_id" not in result["posts"][0]
        assert "category" not in result["posts"][0]


# ─────────────────────────────────────────────────────────────────
# AdminService.add_post / update_post
# ─────────────────────────────────────────────────────────────────


class TestAdminAddPost:
    async def test_add_post_with_tags(self, admin_service):
        post_id = await admin_service.add_post(
            title="Hello",
            body="World",
            tags=["python", "  python ", "fastapi"],
            is_pinned=0,
        )

        post = await Post.find_one({"_id": ObjectId(post_id)})
        assert post is not None
        assert post.tags == ["python", "fastapi"]

    async def test_add_post_with_no_tags(self, admin_service):
        post_id = await admin_service.add_post(
            title="No Tags",
            body="Body",
            is_pinned=0,
        )

        post = await Post.find_one({"_id": ObjectId(post_id)})
        assert post is not None
        assert post.tags == []

    async def test_payload_does_not_require_category_id(self, admin_service):
        """The new schema drops category_id entirely — passing only tags."""
        post_id = await admin_service.add_post(
            title="Shape test",
            body="Body",
            tags=["shape"],
            is_pinned=0,
        )

        post = await Post.find_one({"_id": ObjectId(post_id)})
        assert post is not None
        # Legacy field stays None
        assert post.category_id is None


class TestAdminUpdatePost:
    async def test_update_replaces_tags(self, admin_service):
        created_id = await admin_service.add_post(
            title="T", body="B", tags=["old"], is_pinned=0
        )

        await admin_service.update_post(
            post_id=created_id,
            title="T2",
            body="B2",
            tags=["new1", "new2"],
            is_pinned=1,
        )

        post = await Post.find_one({"_id": ObjectId(created_id)})
        assert post.tags == ["new1", "new2"]
        assert post.is_pinned == 1

    async def test_update_cleans_tags(self, admin_service):
        created_id = await admin_service.add_post(
            title="T", body="B", tags=["Old"], is_pinned=0
        )

        await admin_service.update_post(
            post_id=created_id,
            title="T",
            body="B",
            tags=["  A  ", "A", "B"],  # dedup / strip test
            is_pinned=0,
        )

        post = await Post.find_one({"_id": ObjectId(created_id)})
        assert post.tags == ["A", "B"]


# ─────────────────────────────────────────────────────────────────
# API endpoint tests
# ─────────────────────────────────────────────────────────────────


class TestTagsEndpoints:
    async def test_get_tags_empty(self, api_client, api_user):
        resp = await api_client.get("/api/v1/tags")
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["tags"] == []

    async def test_get_tags_with_data(self, api_client, api_user):
        await _make_post(tags=["python"]).insert()
        await _make_post(tags=["python", "go"]).insert()

        resp = await api_client.get("/api/v1/tags")
        assert resp.status_code == 200
        body = resp.json()
        by_name = {t["name"]: t["count"] for t in body["data"]["tags"]}
        assert by_name == {"python": 2, "go": 1}

    async def test_get_posts_by_tag(self, api_client, api_user):
        p = await _make_post(title="Match", tags=["fastapi"]).insert()
        await _make_post(title="NoMatch", tags=["django"]).insert()

        resp = await api_client.get(f"/api/v1/tags/{'fastapi'}/posts")
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["tag"] == "fastapi"
        assert body["data"]["total"] == 1
        assert body["data"]["posts"][0]["_id"] == str(p.id)

    async def test_get_posts_by_tag_url_encoded(
        self, api_client, api_user
    ):
        await _make_post(tags=["C++"]).insert()

        resp = await api_client.get("/api/v1/tags/C%2B%2B/posts")
        assert resp.status_code == 200
        assert resp.json()["data"]["total"] == 1


class TestAdminPostEndpoints:
    async def test_add_post_with_tags(self, api_client, api_user):
        resp = await api_client.post(
            "/api/v1/admin/post/add",
            json={
                "title": "Tagged",
                "body": "Body",
                "tags": ["x", "y"],
                "is_pinned": 0,
            },
        )
        assert resp.status_code == 201
        assert "_id" in resp.json()["data"]

    async def test_add_post_without_category_id(
        self, api_client, api_user
    ):
        """Schema no longer requires category_id — posting without it succeeds."""
        resp = await api_client.post(
            "/api/v1/admin/post/add",
            json={
                "title": "NoCategory",
                "body": "Body",
                "tags": ["z"],
                "is_pinned": 0,
            },
        )
        assert resp.status_code == 201

    async def test_update_post_with_tags(self, api_client, api_user):
        # Create
        create_resp = await api_client.post(
            "/api/v1/admin/post/add",
            json={
                "title": "Old",
                "body": "Body",
                "tags": ["old"],
                "is_pinned": 0,
            },
        )
        post_id = create_resp.json()["data"]["_id"]

        # Update
        update_resp = await api_client.put(
            "/api/v1/admin/post/update",
            json={
                "_id": post_id,
                "title": "New",
                "body": "Body",
                "tags": ["new"],
                "is_pinned": 1,
            },
        )
        assert update_resp.status_code == 200

        post = await Post.find_one({"_id": ObjectId(post_id)})
        assert post.tags == ["new"]

    async def test_add_post_stores_tags_in_mongo(
        self, api_client, api_user
    ):
        resp = await api_client.post(
            "/api/v1/admin/post/add",
            json={
                "title": "Persist",
                "body": "Body",
                "tags": ["alpha", "beta"],
                "is_pinned": 0,
            },
        )
        post_id = resp.json()["data"]["_id"]

        post = await Post.find_one({"_id": ObjectId(post_id)})
        assert post.tags == ["alpha", "beta"]
        assert post.category_id is None
