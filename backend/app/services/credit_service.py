"""积分扣减/退款 —— py 端共享 helper（spec task-548）。

表结构由 Go 端 GORM AutoMigrate 负责，py 侧只读写（先例：llm_usage_service）。
与 llm_usage_service 的"失败静默留痕"相反，积分是资金操作：扣费/退款失败
**必须**抛出，事务回滚保证余额与流水一致，绝不吞异常。

原子性：扣减用条件 UPDATE ... RETURNING（``balance >= cost``）而非先查后改，
并发下不可能超卖。幂等：依赖 ``credit_transaction`` 的 (source, user_id, biz_id)
联合唯一索引（按 user 隔离，他人同 key 互不命中），INSERT 包在 savepoint
（begin_nested）里——冲突只回滚"扣减+流水"这一段，外层 session 仍可查回已有
流水返回，不双扣。

数值全部厘制整型（单位 0.01 分）；流水 type 词表 grant/consume/refund。
``session`` 参数对齐 event_service 模式：传入时复用（测试/同事务组合），
否则经 ``get_async_session()`` 开独立 session 落生产库（退出即 commit）。
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.des.db import get_async_session
from app.core.exceptions import APIError
from app.models.credit import CreditPrice, CreditTransaction, CreditWallet

# ============================================================================
# Domain Errors —— APIError 子类，task-549 端点直接 raise 即被全局 handler 路由
# ============================================================================


class InsufficientBalanceError(APIError):
    """余额不足（厘制），应拒单——对应 HTTP 402。"""

    def __init__(
        self, message: str = "Insufficient credit balance", **kwargs
    ) -> None:
        super().__init__(message=message, code=402, **kwargs)


class CreditPriceNotFoundError(APIError):
    """(source, variant) 无定价记录——定价表缺配置或客户端传了未知档位。"""

    def __init__(
        self, message: str = "Credit price not found", **kwargs
    ) -> None:
        super().__init__(message=message, code=404, **kwargs)


class InvalidBizIDError(APIError):
    """客户端幂等键非法（超长或撞保留前缀），应拒单——对应 HTTP 400。"""

    def __init__(
        self, message: str = "Invalid biz_id", **kwargs
    ) -> None:
        super().__init__(message=message, code=400, **kwargs)


# biz_id 列宽 64；退款/结算流水键为 "refund:{biz_id}" / "settle:{biz_id}"
# （两前缀同为 7 字符），客户端键必须预留前缀空间否则 INSERT 被截断。
MAX_BIZ_ID_LEN = 64 - len("refund:")  # 57
RESERVED_BIZ_ID_PREFIXES = ("refund:", "settle:")


def _validate_biz_id(biz_id: str) -> None:
    if len(biz_id) > MAX_BIZ_ID_LEN or biz_id.startswith(
        RESERVED_BIZ_ID_PREFIXES
    ):
        raise InvalidBizIDError(
            message=(
                f"biz_id must be <= {MAX_BIZ_ID_LEN} chars and cannot start "
                f"with {' or '.join(RESERVED_BIZ_ID_PREFIXES)}"
            )
        )


# ============================================================================
# 内部原语
# ============================================================================


async def _ensure_wallet(session: AsyncSession, user_id: int) -> None:
    """懒创建钱包行（balance=0）；并发下靠 user_id 唯一索引兜底只产生一行。"""
    now = datetime.now(UTC)
    await session.execute(
        pg_insert(CreditWallet)
        .values(
            user_id=user_id,
            balance=0,
            total_spent=0,
            created_at=now,
            updated_at=now,
        )
        .on_conflict_do_nothing(index_elements=["user_id"])
    )


async def _find_txn(
    session: AsyncSession, user_id: int, source: str, biz_id: str
) -> CreditTransaction | None:
    result = await session.execute(
        select(CreditTransaction).where(
            CreditTransaction.user_id == user_id,
            CreditTransaction.source == source,
            CreditTransaction.biz_id == biz_id,
        )
    )
    return result.scalar_one_or_none()


async def _preconsume(
    session: AsyncSession,
    user_id: int,
    source: str,
    variant: str,
    qty: int,
    biz_id: str,
    meta: dict | None,
) -> tuple[CreditTransaction, bool]:
    unit_price = (
        await session.execute(
            select(CreditPrice.unit_price).where(
                CreditPrice.source == source,
                CreditPrice.variant == variant,
            )
        )
    ).scalar_one_or_none()
    if unit_price is None:
        raise CreditPriceNotFoundError(
            message=f"no credit price for {source}/{variant}"
        )
    cost = unit_price * qty

    await _ensure_wallet(session, user_id)

    txn: CreditTransaction
    try:
        # savepoint：扣减 UPDATE 与 consume 流水 INSERT 同生共死，
        # (source,biz_id) 冲突时整段回滚，外层事务不受影响。
        async with session.begin_nested():
            balance = (
                await session.execute(
                    update(CreditWallet)
                    .where(
                        CreditWallet.user_id == user_id,
                        CreditWallet.balance >= cost,
                    )
                    .values(
                        balance=CreditWallet.balance - cost,
                        total_spent=CreditWallet.total_spent + cost,
                        updated_at=datetime.now(UTC),
                    )
                    .returning(CreditWallet.balance)
                )
            ).scalar_one_or_none()
            if balance is None:
                raise InsufficientBalanceError(
                    message=f"credit balance insufficient for {source}, cost={cost}"
                )
            txn = CreditTransaction(
                user_id=user_id,
                source=source,
                biz_id=biz_id,
                type="consume",
                amount=-cost,
                balance_after=balance,
                meta={"variant": variant, "qty": qty, **(meta or {})},
            )
            session.add(txn)
            await session.flush()
    except IntegrityError:
        # 同 (user,source,biz_id) 已计费 —— 幂等返回已有流水（created=False，
        # 调用方不得据此退款），本次扣减已随 savepoint 回滚，不双扣。
        existing = await _find_txn(session, user_id, source, biz_id)
        assert existing is not None, "unique conflict without existing row"
        return existing, False
    return txn, True


async def _refund(
    session: AsyncSession,
    user_id: int,
    source: str,
    biz_id: str,
    amount: int | None,
    meta: dict | None,
) -> CreditTransaction | None:
    consume = (
        await session.execute(
            select(CreditTransaction).where(
                CreditTransaction.user_id == user_id,
                CreditTransaction.source == source,
                CreditTransaction.biz_id == biz_id,
                CreditTransaction.type == "consume",
            )
        )
    ).scalar_one_or_none()
    if consume is None:
        return None

    refund_amount = -consume.amount if amount is None else amount
    if refund_amount <= 0 or refund_amount > -consume.amount:
        raise ValueError(
            f"invalid refund amount {refund_amount} for consume {-consume.amount}"
        )

    # 确定性退款幂等键：重复退撞 (user,source,"refund:{biz_id}") 唯一索引 → 回查返回。
    refund_biz_id = f"refund:{biz_id}"
    await _ensure_wallet(session, user_id)

    txn: CreditTransaction
    try:
        async with session.begin_nested():
            balance = (
                await session.execute(
                    update(CreditWallet)
                    .where(CreditWallet.user_id == user_id)
                    .values(
                        balance=CreditWallet.balance + refund_amount,
                        total_spent=CreditWallet.total_spent - refund_amount,
                        updated_at=datetime.now(UTC),
                    )
                    .returning(CreditWallet.balance)
                )
            ).scalar_one()
            txn = CreditTransaction(
                user_id=user_id,
                source=source,
                biz_id=refund_biz_id,
                type="refund",
                amount=refund_amount,
                balance_after=balance,
                meta={
                    "variant": (consume.meta or {}).get("variant", ""),
                    "ref_biz_id": biz_id,
                    **(meta or {}),
                },
            )
            session.add(txn)
            await session.flush()
    except IntegrityError:
        existing = await _find_txn(session, user_id, source, refund_biz_id)
        assert existing is not None, "unique conflict without existing row"
        return existing
    return txn


# ============================================================================
# Public helpers
# ============================================================================


async def preconsume(
    user_id: int,
    source: str,
    variant: str,
    qty: int,
    biz_id: str = "",
    meta: dict | None = None,
    *,
    session: AsyncSession | None = None,
) -> tuple[CreditTransaction, bool]:
    """预扣积分：查价 → 原子扣减 → 记 consume 流水，单事务。

    返回 ``(流水, created)``：新扣成功 ``(txn, True)``；``(user_id, source,
    biz_id)`` 唯一冲突幂等命中 ``(已有流水, False)``——调用方只对
    created=True 挂退款，重放请求失败不得退掉首笔已成功交付的扣费。

    ``biz_id`` 空则服务端生成 uuid4 hex（幂等键，调用方应尽可能传入以支持
    重试去重）。客户端传入的 key 超长（>``MAX_BIZ_ID_LEN``）或撞保留前缀
    （``refund:``/``settle:``）→ ``InvalidBizIDError``（400，不产生扣费）。

    失败必抛：``CreditPriceNotFoundError``（无定价）/
    ``InsufficientBalanceError``（余额不足，不产生流水）。
    """
    biz_id = biz_id or uuid4().hex
    _validate_biz_id(biz_id)
    if qty <= 0:
        raise ValueError(f"qty must be positive, got {qty}")

    if session is not None:
        return await _preconsume(
            session, user_id, source, variant, qty, biz_id, meta
        )

    async with get_async_session() as prod_session:
        return await _preconsume(
            prod_session, user_id, source, variant, qty, biz_id, meta
        )


async def refund(
    user_id: int,
    source: str,
    biz_id: str,
    amount: int | None = None,
    meta: dict | None = None,
    *,
    session: AsyncSession | None = None,
) -> CreditTransaction | None:
    """退款：按 consume 流水反向加回余额并记 refund 流水，单事务。

    ``amount`` 缺省全额退（厘制）；退款幂等键为 ``f"refund:{biz_id}"``，
    重复退款幂等返回已有 refund 流水。找不到 consume 流水返回 ``None``。
    """
    if not biz_id:
        raise ValueError("biz_id is required for refund")

    if session is not None:
        return await _refund(session, user_id, source, biz_id, amount, meta)

    async with get_async_session() as prod_session:
        return await _refund(
            prod_session, user_id, source, biz_id, amount, meta
        )


async def get_balance(
    user_id: int, *, session: AsyncSession | None = None
) -> tuple[int, int]:
    """查询 (balance, total_spent)，厘制；无钱包行返回 (0, 0)。"""

    async def _query(s: AsyncSession) -> tuple[int, int]:
        row = (
            await s.execute(
                select(CreditWallet.balance, CreditWallet.total_spent).where(
                    CreditWallet.user_id == user_id
                )
            )
        ).first()
        return (row.balance, row.total_spent) if row else (0, 0)

    if session is not None:
        return await _query(session)

    async with get_async_session() as prod_session:
        return await _query(prod_session)
