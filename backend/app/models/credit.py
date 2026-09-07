from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class CreditWallet(Base):
    """用户积分钱包 —— 一人一行，懒创建。

    数值为厘制整型（单位 0.01 分），"分"换算只发生在 API 边界。
    表结构由 Go 端 GORM AutoMigrate 负责（对齐 ``internal/model/credit.go``），
    本模型仅读写；索引名照抄实库（GORM Namer 产物）。
    """

    __tablename__ = "credit_wallet"
    __table_args__ = (
        Index("ix_credit_wallet_userid", "user_id", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger)
    balance: Mapped[int] = mapped_column(BigInteger, default=0)
    total_spent: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class CreditTransaction(Base):
    """积分流水 —— Type 词表: grant / consume / refund。

    ``amount`` 正=入账、负=出账；``balance_after`` 为记账后余额快照。
    ``(source, user_id, biz_id)`` 联合唯一 = 幂等键：重复请求命中唯一约束即
    已计费，不双扣；按 user 隔离，他人同 key 互不命中。表结构由 Go 端 GORM
    AutoMigrate 负责，本模型仅读写（索引名逐字对齐 ``internal/model/credit.go``）。
    """

    __tablename__ = "credit_transaction"
    __table_args__ = (
        UniqueConstraint(
            "source",
            "user_id",
            "biz_id",
            name="uq_credit_transaction_source_user_biz",
        ),
        # user_id 单列查询由下面复合索引的前缀覆盖，与 Go 端一致不另建。
        Index(
            "ix_credit_transaction_user_id_created_at_id",
            "user_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, index=False)
    source: Mapped[str] = mapped_column(String(50))
    biz_id: Mapped[str] = mapped_column(String(64))
    type: Mapped[str] = mapped_column(String(20), index=False)
    amount: Mapped[int] = mapped_column(BigInteger)
    balance_after: Mapped[int] = mapped_column(BigInteger)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        index=False,
    )


class CreditPrice(Base):
    """按次定额价格表 —— ``(source, variant)`` 联合唯一。

    非档位服务 ``variant = ''``（如 translate / nomu_prompt_optimize），
    生图按档定价（design_generate 的 lite / pro）。调价直改表数据，不做 API。
    表结构由 Go 端 GORM AutoMigrate 负责并 seed，本模型只读。
    """

    __tablename__ = "credit_price"
    __table_args__ = (
        UniqueConstraint(
            "source", "variant", name="uq_credit_price_source_variant"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    source: Mapped[str] = mapped_column(String(50))
    variant: Mapped[str] = mapped_column(
        String(20), default="", server_default=""
    )
    unit_price: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
