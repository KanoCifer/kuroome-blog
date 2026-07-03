"""Unit tests for app.plugins.notification — pure logic, no DB."""

from __future__ import annotations

import pytest

from app.plugins.notification.notification import (
    Message,
    NotificationContext,
    NotificationPlugin,
    notify,
)


class _FakeChannel:
    """Test double for NotificationChannel."""

    def __init__(self, name: str, *, should_fail: bool = False) -> None:
        self.name = name
        self.should_fail = should_fail
        self.sent_messages: list[tuple[Message, NotificationContext]] = []

    async def send(
        self, message: Message, ctx: NotificationContext
    ) -> bool:
        self.sent_messages.append((message, ctx))
        return not self.should_fail


@pytest.fixture
def plugin() -> NotificationPlugin:
    return NotificationPlugin(
        channels={
            "ch1": _FakeChannel("ch1"),
            "ch2": _FakeChannel("ch2"),
        }
    )


def test_message_default_html_none():
    msg = Message(title="t", body="b")
    assert msg.html is None


def test_message_with_html():
    msg = Message(title="t", body="b", html="<p>b</p>")
    assert msg.html == "<p>b</p>"


def test_context_default_fields_none():
    ctx = NotificationContext()
    assert ctx.email is None
    assert ctx.feishu_webhook_url is None
    assert ctx.bark_device_key is None


@pytest.mark.asyncio
async def test_notify_sends_to_all_channels(plugin: NotificationPlugin):
    msg = Message(title="Hello", body="World")
    ctx = NotificationContext(email="test@example.com")

    results = await plugin.notify(["ch1", "ch2"], msg, ctx)

    assert results == {"ch1": True, "ch2": True}
    assert len(plugin._channels["ch1"].sent_messages) == 1
    assert len(plugin._channels["ch2"].sent_messages) == 1


@pytest.mark.asyncio
async def test_notify_unknown_channel_returns_false(
    plugin: NotificationPlugin,
):
    msg = Message(title="t", body="b")
    ctx = NotificationContext()

    results = await plugin.notify(["ch1", "unknown"], msg, ctx)

    assert results["ch1"] is True
    assert results["unknown"] is False


@pytest.mark.asyncio
async def test_notify_failed_channel_returns_false(
    plugin: NotificationPlugin,
):
    plugin._channels["fail"] = _FakeChannel("fail", should_fail=True)
    msg = Message(title="t", body="b")
    ctx = NotificationContext()

    results = await plugin.notify(["ch1", "fail"], msg, ctx)

    assert results["ch1"] is True
    assert results["fail"] is False


@pytest.mark.asyncio
async def test_notify_does_not_break_on_exception(
    plugin: NotificationPlugin,
):
    class _ExplodingChannel:
        name = "boom"

        async def send(self, message, ctx):
            raise RuntimeError("kaboom")

    plugin._channels["boom"] = _ExplodingChannel()  # type: ignore[assignment]
    msg = Message(title="t", body="b")
    ctx = NotificationContext()

    results = await plugin.notify(["ch1", "boom"], msg, ctx)

    assert results["ch1"] is True
    assert results["boom"] is False


@pytest.mark.asyncio
async def test_register_overrides_existing_channel(
    plugin: NotificationPlugin,
):
    new_ch = _FakeChannel("ch1")
    plugin.register(new_ch)

    msg = Message(title="t", body="b")
    ctx = NotificationContext()
    await plugin.notify(["ch1"], msg, ctx)

    assert new_ch.sent_messages


@pytest.mark.asyncio
async def test_module_level_notify_uses_default_plugin():
    """The module-level notify() should work with a custom plugin."""
    custom = NotificationPlugin(
        channels={"fake": _FakeChannel("fake")}
    )
    msg = Message(title="t", body="b")
    ctx = NotificationContext()

    results = await notify(["fake"], msg, ctx, plugin=custom)

    assert results == {"fake": True}
