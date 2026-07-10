from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Event(Base):
    """关键服务事件 —— 承载启动 / 部署 / 启动失败等业务事件。

    区别于 ``Log`` 表：log 是机器噪音/WARNING+ 持久化；event 是给人看的业务事件。
    """

    __tablename__ = "event"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), index=True)
    source: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    __table_args__ = (Index("ix_event_type_timestamp", "type", "timestamp"),)
