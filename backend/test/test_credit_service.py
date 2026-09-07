"""Integration tests for app.models.credit / app.services.credit_service.

真实 Postgres（RETURNING / ON CONFLICT / 唯一索引 / JSONB 需要），走 conftest
的 postgres_test 库 + create_all 建表（模型定义正确即可建出三表）。
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select

from app.models.credit import CreditPrice, CreditTransaction, CreditWallet
from app.services.credit_service import (
    MAX_BIZ_ID_LEN,
    CreditPriceNotFoundError,
    InsufficientBalanceError,
    InvalidBizIDError,
    get_balance,
    preconsume,
    refund,
)

# Share the session loop so asyncpg Futures don't cross loop boundaries.
pytestmark = pytest.mark.asyncio(loop_scope="session")

USER_ID = 910001


def _now():
    return datetime.now(UTC)


@pytest_asyncio.fixture
async def wallet(db_session):
    """余额 100 厘的钱包 + translate(10)/design_generate lite(3000) 定价。"""
    db_session.add(
        CreditWallet(
            user_id=USER_ID,
            balance=100,
            total_spent=0,
            created_at=_now(),
            updated_at=_now(),
        )
    )
    db_session.add(CreditPrice(source="translate", variant="", unit_price=10))
    db_session.add(
        CreditPrice(source="design_generate", variant="lite", unit_price=3000)
    )
    await db_session.flush()
    return USER_ID


async def test_preconsume_success(db_session, wallet):
    """preconsume 成功：条件 UPDATE 扣减、写 consume 流水（负额/快照/meta）。"""
    txn, created = await preconsume(
        wallet, "translate", "", 2, "biz-1", {"src": "t"}, session=db_session
    )
    assert created is True
    assert txn.id is not None
    assert txn.type == "consume"
    assert txn.amount == -20  # 10 * 2
    assert txn.balance_after == 80
    assert txn.meta == {"variant": "", "qty": 2, "src": "t"}

    balance, total_spent = await get_balance(wallet, session=db_session)
    assert (balance, total_spent) == (80, 20)


async def test_preconsume_no_price_raises(db_session, wallet):
    """(source,variant) 无定价 → CreditPriceNotFoundError，不动余额不写流水。"""
    with pytest.raises(CreditPriceNotFoundError):
        await preconsume(
            wallet, "unknown_svc", "", 1, "biz-x", session=db_session
        )
    assert await get_balance(wallet, session=db_session) == (100, 0)
    count = await db_session.scalar(
        select(func.count()).select_from(CreditTransaction)
    )
    assert count == 0


async def test_preconsume_insufficient_balance_no_txn(db_session, wallet):
    """余额不足（30 厘 > 余额 100 厘的单次价格）→ raise 且 savepoint 回滚不留流水。
    design lite 单价 3000 > 100，条件 UPDATE 不满足。"""
    with pytest.raises(InsufficientBalanceError):
        await preconsume(
            wallet, "design_generate", "lite", 1, "biz-big", session=db_session
        )
    assert await get_balance(wallet, session=db_session) == (100, 0)
    count = await db_session.scalar(
        select(func.count())
        .select_from(CreditTransaction)
        .where(CreditTransaction.user_id == wallet)
    )
    assert count == 0


async def test_preconsume_idempotent_same_biz_id(db_session, wallet):
    """同 (user,source,biz_id) 重复 preconsume → 幂等返回 (已有流水, False)，不双扣。"""
    first, created1 = await preconsume(
        wallet, "translate", "", 1, "dup-biz", session=db_session
    )
    second, created2 = await preconsume(
        wallet, "translate", "", 1, "dup-biz", session=db_session
    )
    assert created1 is True
    assert created2 is False
    assert second.id == first.id
    assert await get_balance(wallet, session=db_session) == (90, 10)
    count = await db_session.scalar(
        select(func.count())
        .select_from(CreditTransaction)
        .where(CreditTransaction.biz_id == "dup-biz")
    )
    assert count == 1


async def test_preconsume_same_biz_id_other_user_not_hit(db_session, wallet):
    """跨用户同 (source,biz_id) 互不命中：B 用自己的钱扣，不撞 A 的流水。"""
    other = 910002
    db_session.add(
        CreditWallet(
            user_id=other, balance=100, total_spent=0,
            created_at=_now(), updated_at=_now(),
        )
    )
    await db_session.flush()

    txn_a, created_a = await preconsume(
        wallet, "translate", "", 1, "shared-key", session=db_session
    )
    txn_b, created_b = await preconsume(
        other, "translate", "", 1, "shared-key", session=db_session
    )
    assert created_a is True and created_b is True
    assert txn_a.id != txn_b.id
    assert txn_a.user_id == wallet and txn_b.user_id == other
    # 各扣各的：A 100→90，B 100→90
    assert await get_balance(wallet, session=db_session) == (90, 10)
    assert await get_balance(other, session=db_session) == (90, 10)


async def test_preconsume_rejects_reserved_prefix_and_overlong(
    db_session, wallet
):
    """refund:/settle: 保留前缀或超长（>57）客户端 key → InvalidBizIDError，不动余额。"""
    for bad in (
        "refund:whatever",
        "settle:whatever",
        "x" * (MAX_BIZ_ID_LEN + 1),
    ):
        with pytest.raises(InvalidBizIDError):
            await preconsume(
                wallet, "translate", "", 1, bad, session=db_session
            )
    assert await get_balance(wallet, session=db_session) == (100, 0)
    count = await db_session.scalar(
        select(func.count()).select_from(CreditTransaction)
    )
    assert count == 0


async def test_preconsume_max_len_biz_id_ok(db_session, wallet):
    """恰好 57 字符的 key 合法（refund: 前缀拼上正好 64）。"""
    ok = "x" * MAX_BIZ_ID_LEN
    txn, created = await preconsume(
        wallet, "translate", "", 1, ok, session=db_session
    )
    assert created is True and txn.biz_id == ok


async def test_preconsume_generates_biz_id_when_empty(db_session, wallet):
    """biz_id 缺省 → 服务端 uuid4 兜底，两次调用是两笔独立扣费。"""
    t1, _ = await preconsume(wallet, "translate", "", 1, session=db_session)
    t2, _ = await preconsume(wallet, "translate", "", 1, session=db_session)
    assert t1.biz_id and t2.biz_id and t1.biz_id != t2.biz_id
    assert await get_balance(wallet, session=db_session) == (80, 20)


async def test_preconsume_lazy_wallet(db_session):
    """无钱包用户：懒建行后余额 0 → InsufficientBalanceError，无流水。"""
    db_session.add(CreditPrice(source="translate", variant="", unit_price=10))
    await db_session.flush()
    with pytest.raises(InsufficientBalanceError):
        await preconsume(
            920003, "translate", "", 1, "lazy-1", session=db_session
        )
    assert await get_balance(920003, session=db_session) == (0, 0)
    count = await db_session.scalar(
        select(func.count())
        .select_from(CreditTransaction)
        .where(CreditTransaction.user_id == 920003)
    )
    assert count == 0


async def test_refund_success_and_idempotent(db_session, wallet):
    """全额退款加回余额、冲减 total_spent；重复退款幂等返回同一行。"""
    consume, created = await preconsume(
        wallet, "translate", "", 3, "need-refund", session=db_session
    )
    assert created is True
    assert consume.amount == -30

    r1 = await refund(wallet, "translate", "need-refund", session=db_session)
    assert r1 is not None
    assert r1.type == "refund"
    assert r1.amount == 30
    assert r1.biz_id == "refund:need-refund"
    assert r1.meta["ref_biz_id"] == "need-refund"
    assert await get_balance(wallet, session=db_session) == (100, 0)

    r2 = await refund(wallet, "translate", "need-refund", session=db_session)
    assert r2.id == r1.id
    assert await get_balance(wallet, session=db_session) == (100, 0)
    count = await db_session.scalar(
        select(func.count())
        .select_from(CreditTransaction)
        .where(CreditTransaction.type == "refund")
    )
    assert count == 1


async def test_refund_partial_and_missing_consume(db_session, wallet):
    """支持部分退款；无 consume 流水返回 None。"""
    await preconsume(wallet, "translate", "", 2, "part", session=db_session)
    other = 910002
    db_session.add(
        CreditWallet(
            user_id=other, balance=100, total_spent=0,
            created_at=_now(), updated_at=_now(),
        )
    )
    await db_session.flush()
    # consume 找回按 user 过滤：他人同 biz_id 退款找不到本用户的流水
    assert (
        await refund(other, "translate", "part", session=db_session)
    ) is None
    r = await refund(
        wallet, "translate", "part", amount=10, session=db_session
    )
    assert r is not None and r.amount == 10
    # 扣 20 退 10：balance 80+10=90，total_spent 净消耗 20-10=10
    assert await get_balance(wallet, session=db_session) == (90, 10)

    assert (
        await refund(wallet, "translate", "ghost", session=db_session)
    ) is None


async def test_get_balance_no_wallet(db_session):
    """无钱包行返回 (0,0)，不建行。"""
    assert await get_balance(888888, session=db_session) == (0, 0)


# ── 并发不超卖 ─────────────────────────────────────────────────────
# rollback-isolated 的 db_session 单连接串行，无法验证并发；这里每任务
# 独立 session + commit（真多连接），50 厘余额并发 9 次 10 厘扣减只成 5 笔。


async def test_concurrent_preconsume_no_oversell(db_engine, tables):
    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    uid = 930001
    async with factory() as s:
        s.add(CreditPrice(source="cc_svc", variant="", unit_price=10))
        s.add(
            CreditWallet(
                user_id=uid,
                balance=50,
                total_spent=0,
                created_at=_now(),
                updated_at=_now(),
            )
        )
        await s.commit()

    async def attempt(i: int):
        async with factory() as s:
            try:
                txn, _ = await preconsume(
                    uid, "cc_svc", "", 1, f"cc-{i}", session=s
                )
                await s.commit()
                return txn
            except InsufficientBalanceError:
                await s.rollback()
                return None

    try:
        results = await asyncio.gather(*(attempt(i) for i in range(9)))
        succeeded = [r for r in results if r is not None]
        assert len(succeeded) == 5  # floor(50 / 10)

        async with factory() as s:
            balance, total_spent = await get_balance(uid, session=s)
            assert (balance, total_spent) == (0, 50)
            count = await s.scalar(
                select(func.count())
                .select_from(CreditTransaction)
                .where(
                    CreditTransaction.user_id == uid,
                    CreditTransaction.type == "consume",
                )
            )
            assert count == 5
    finally:
        async with factory() as s:
            await s.execute(
                delete(CreditTransaction).where(
                    CreditTransaction.user_id == uid
                )
            )
            await s.execute(
                delete(CreditWallet).where(CreditWallet.user_id == uid)
            )
            await s.execute(
                delete(CreditPrice).where(CreditPrice.source == "cc_svc")
            )
            await s.commit()
