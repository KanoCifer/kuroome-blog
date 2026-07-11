"""Integration tests for app.repositories.sub_repo — requires test DB."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio

from app.models.models import User
from app.repositories.sub_repo import SubRepo

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture
async def sub_repo():
    return SubRepo()


@pytest_asyncio.fixture
async def user(db_session):
    u = User(username="testuser", password="testpass123")
    db_session.add(u)
    await db_session.flush()
    return u


@pytest_asyncio.fixture
async def another_user(db_session):
    u = User(username="otheruser", password="otherpass")
    db_session.add(u)
    await db_session.flush()
    return u


def _sub_data(**overrides):
    """Return minimal valid subscription data with overrides."""
    data = {
        "name": "Netflix",
        "provider": "Netflix Inc",
        "price": 15.99,
        "currency": "USD",
        "billing_cycle": "monthly",
        "next_billing_date": datetime.now(UTC) + timedelta(days=30),
        "status": "active",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_create_subscription(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Spotify")
    )
    assert sub.id is not None
    assert sub.name == "Spotify"
    assert sub.user_id == user.id
    assert sub.status == "active"


@pytest.mark.asyncio
async def test_create_subscription_with_string_date(sub_repo, user, db_session):
    date_str = (datetime.now(UTC) + timedelta(days=7)).isoformat()
    sub = await sub_repo.create_one_subscription(
        db_session,
        user.id,
        **_sub_data(next_billing_date=date_str),
    )
    assert isinstance(sub.next_billing_date, datetime)


@pytest.mark.asyncio
async def test_get_all_subscriptions_filters_by_user(
    sub_repo, user, another_user, db_session
):
    await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Sub1")
    )
    await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Sub2")
    )
    await sub_repo.create_one_subscription(
        db_session, another_user.id, **_sub_data(name="Other")
    )

    user_subs = await sub_repo.get_all_subscriptions(db_session, user.id)
    assert len(user_subs) == 2
    assert all(s.user_id == user.id for s in user_subs)


@pytest.mark.asyncio
async def test_get_subscription_by_id(sub_repo, user, db_session):
    created = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="FindMe")
    )
    found = await sub_repo.get_subscription_by_id(db_session, created.id)
    assert found is not None
    assert found.name == "FindMe"


@pytest.mark.asyncio
async def test_get_subscription_by_id_returns_none_for_missing(sub_repo, db_session):
    result = await sub_repo.get_subscription_by_id(db_session, 99999)
    assert result is None


@pytest.mark.asyncio
async def test_update_subscription(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="OldName", price=10.0)
    )
    updated = await sub_repo.update_subscription(
        db_session, sub.id, name="NewName", price=20.0
    )
    assert updated is not None
    assert updated.name == "NewName"
    assert updated.price == 20.0


@pytest.mark.asyncio
async def test_update_subscription_returns_none_for_missing(sub_repo, db_session):
    result = await sub_repo.update_subscription(db_session, 99999, name="X")
    assert result is None


@pytest.mark.asyncio
async def test_update_subscription_skips_none_values(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="KeepName", price=10.0)
    )
    updated = await sub_repo.update_subscription(
        db_session, sub.id, name=None, price=25.0
    )
    assert updated is not None
    assert updated.name == "KeepName"
    assert updated.price == 25.0


@pytest.mark.asyncio
async def test_delete_subscription(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="ToDelete")
    )
    result = await sub_repo.delete_subscription(db_session, sub.id)
    assert result is True
    assert await sub_repo.get_subscription_by_id(db_session, sub.id) is None


@pytest.mark.asyncio
async def test_delete_subscription_returns_false_for_missing(sub_repo, db_session):
    assert await sub_repo.delete_subscription(db_session, 99999) is False


@pytest.mark.asyncio
async def test_update_status(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(status="active")
    )
    updated = await sub_repo.update_status(db_session, sub.id, "canceled")
    assert updated is not None
    assert updated.status == "canceled"


@pytest.mark.asyncio
async def test_update_reminder_config(sub_repo, user, db_session):
    sub = await sub_repo.create_one_subscription(db_session, user.id, **_sub_data())
    config = {"days_before": [7, 3, 1], "channels": ["email"]}
    updated = await sub_repo.update_reminder_config(db_session, sub.id, config)
    assert updated is not None
    assert updated.reminder_config == config


@pytest.mark.asyncio
async def test_get_active_subscriptions(sub_repo, user, db_session):
    await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Active1", status="active")
    )
    await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Canceled", status="canceled")
    )
    await sub_repo.create_one_subscription(
        db_session, user.id, **_sub_data(name="Active2", status="active")
    )

    active = await sub_repo.get_active_subscriptions(db_session)
    assert len(active) == 2
    assert all(s.status == "active" for s in active)
