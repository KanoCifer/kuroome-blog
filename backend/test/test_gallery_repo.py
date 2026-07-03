"""Integration tests for app.repositories.gallery_repo — requires test DB."""

from __future__ import annotations

import pytest
import pytest_asyncio

from app.models.models import GalleryImage, User
from app.repositories.gallery_repo import GalleryRepo

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def gallery_repo(db_session):
    return GalleryRepo(db_session)


@pytest_asyncio.fixture
async def user(db_session):
    u = User(username="galleryuser", password="pass123")
    db_session.add(u)
    await db_session.flush()
    return u


def _make_image(**overrides):
    data = {
        "url": "https://example.com/img.jpg",
        "description": "A test image",
        "file_size": 1024,
        "mime_type": "image/jpeg",
        "sort_order": 0,
    }
    data.update(overrides)
    return GalleryImage(**data)


@pytest.mark.asyncio
async def test_list_all_returns_empty_when_no_images(gallery_repo):
    result = await gallery_repo.list_all()
    assert result == []


@pytest.mark.asyncio
async def test_list_all_returns_images_ordered_by_sort_order(gallery_repo, user):
    img1 = _make_image(url="https://a.com/1.jpg", sort_order=2)
    img2 = _make_image(url="https://a.com/2.jpg", sort_order=1)
    img3 = _make_image(url="https://a.com/3.jpg", sort_order=0)
    await gallery_repo.save_images([img1, img2, img3])

    result = await gallery_repo.list_all()
    assert len(result) == 3
    assert result[0].url == "https://a.com/3.jpg"
    assert result[1].url == "https://a.com/2.jpg"
    assert result[2].url == "https://a.com/1.jpg"


@pytest.mark.asyncio
async def test_save_images_replaces_all_existing(gallery_repo):
    await gallery_repo.save_images([_make_image(url="https://a.com/old.jpg")])
    assert len(await gallery_repo.list_all()) == 1

    await gallery_repo.save_images([_make_image(url="https://a.com/new.jpg")])
    result = await gallery_repo.list_all()
    assert len(result) == 1
    assert result[0].url == "https://a.com/new.jpg"


@pytest.mark.asyncio
async def test_delete_all_removes_everything(gallery_repo):
    await gallery_repo.save_images([
        _make_image(url="https://a.com/1.jpg"),
        _make_image(url="https://a.com/2.jpg"),
    ])
    assert len(await gallery_repo.list_all()) == 2

    await gallery_repo.delete_all()
    assert await gallery_repo.list_all() == []


@pytest.mark.asyncio
async def test_list_all_with_user_id(gallery_repo, user):
    img = _make_image(url="https://a.com/user.jpg", user_id=user.id)
    await gallery_repo.save_images([img])

    result = await gallery_repo.list_all()
    assert len(result) == 1
    assert result[0].user_id == user.id
