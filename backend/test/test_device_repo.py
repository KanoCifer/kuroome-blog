"""Integration tests for app.repositories.device_repo — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
import pytest_asyncio

from app.models.models import User
from app.repositories.device_repo import DeviceRepo

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def device_repo():
    return DeviceRepo()


@pytest_asyncio.fixture
async def user(db_session):
    u = User(username="deviceuser", password="pass123")
    db_session.add(u)
    await db_session.flush()
    return u


@pytest_asyncio.fixture
async def other_user(db_session):
    u = User(username="otherdevice", password="pass456")
    db_session.add(u)
    await db_session.flush()
    return u


def _device_data(**overrides):
    data = {
        "name": "iPhone 15",
        "purchase_date": datetime(2024, 1, 15, tzinfo=UTC),
        "price": 7999.0,
        "currency": "CNY",
        "status": "active",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_create_device_track(device_repo, db_session, user):
    track = await device_repo.create_device_track(db_session, user.id, **_device_data())
    assert track.id is not None
    assert track.name == "iPhone 15"
    assert track.user_id == user.id
    assert track.status == "active"


@pytest.mark.asyncio
async def test_create_device_track_with_string_date(device_repo, db_session, user):
    track = await device_repo.create_device_track(
        db_session,
        user.id,
        **_device_data(purchase_date="2024-03-10T00:00:00+00:00"),
    )
    assert isinstance(track.purchase_date, datetime)


@pytest.mark.asyncio
async def test_get_device_tracks_by_user_id(device_repo, db_session, user, other_user):
    await device_repo.create_device_track(db_session, user.id, **_device_data(name="U1"))
    await device_repo.create_device_track(db_session, user.id, **_device_data(name="U2"))
    await device_repo.create_device_track(db_session, other_user.id, **_device_data(name="O1"))

    user_tracks = await device_repo.get_device_tracks_by_user_id(db_session, user.id)
    assert len(user_tracks) == 2
    assert all(t.user_id == user.id for t in user_tracks)


@pytest.mark.asyncio
async def test_get_device_track_by_id(device_repo, db_session, user):
    created = await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="FindMe")
    )
    found = await device_repo.get_device_track_by_id(db_session, created.id)
    assert found is not None
    assert found.name == "FindMe"


@pytest.mark.asyncio
async def test_get_device_track_by_id_returns_none_for_missing(device_repo, db_session):
    assert await device_repo.get_device_track_by_id(db_session, 99999) is None


@pytest.mark.asyncio
async def test_update_device_track(device_repo, db_session, user):
    track = await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="Old", price=100.0)
    )
    updated = await device_repo.update_device_track(
        db_session, track.id, name="New", price=200.0
    )
    assert updated is not None
    assert updated.name == "New"
    assert updated.price == 200.0


@pytest.mark.asyncio
async def test_update_device_track_returns_none_for_missing(device_repo, db_session):
    assert await device_repo.update_device_track(db_session, 99999, name="X") is None


@pytest.mark.asyncio
async def test_delete_device_track_by_id(device_repo, db_session, user):
    track = await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="ToDelete")
    )
    assert await device_repo.delete_device_track_by_id(db_session, track.id) is True
    assert await device_repo.get_device_track_by_id(db_session, track.id) is None


@pytest.mark.asyncio
async def test_delete_device_track_by_id_returns_false_for_missing(device_repo, db_session):
    assert await device_repo.delete_device_track_by_id(db_session, 99999) is False


@pytest.mark.asyncio
async def test_delete_device_tracks_by_user_id(device_repo, db_session, user, other_user):
    await device_repo.create_device_track(db_session, user.id, **_device_data(name="U1"))
    await device_repo.create_device_track(db_session, user.id, **_device_data(name="U2"))
    await device_repo.create_device_track(db_session, other_user.id, **_device_data(name="O1"))

    await device_repo.delete_device_tracks_by_user_id(db_session, user.id)

    assert len(await device_repo.get_device_tracks_by_user_id(db_session, user.id)) == 0
    assert len(await device_repo.get_device_tracks_by_user_id(db_session, other_user.id)) == 1


@pytest.mark.asyncio
async def test_get_active_devices(device_repo, db_session, user):
    await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="Active1", status="active")
    )
    await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="Retired", status="retired")
    )
    await device_repo.create_device_track(
        db_session, user.id, **_device_data(name="Active2", status="active")
    )

    active = await device_repo.get_active_devices(db_session)
    assert len(active) == 2
    assert all(t.status == "active" for t in active)
