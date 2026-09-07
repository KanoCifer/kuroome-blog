"""AI 端点积分计费 API 测试（task-549 AC）。

覆盖 ``POST /v2/translate`` 与 ``POST /v2/nomu/prompt-optimize`` 的：
余额不足 402（LLM 零调用）、LLM 失败全额退款、成功 consume 流水、
同 Idempotency-Key 幂等重试不双扣。真实 Postgres（credit 三表 +
rollback-isolated session，同 test_credit_service.py）；LLM 全部 stub。
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import func, select, update

from app.core.exceptions import APIError
from app.models.credit import CreditTransaction, CreditWallet
from app.schemas.nomu import PromptOptimizeResult
from app.schemas.translate import TranslateResult

pytestmark = pytest.mark.asyncio(loop_scope="session")

# case → (url, payload, service attr, method, ok 返回值, source, 厘)
CASES: dict = {
    "translate": (
        "/v2/translate",
        {"text": "hello", "targetLanguage": "中文"},
        "translate_svc",
        "translate",
        lambda: TranslateResult(text="你好"),
        "translate",
        10,
    ),
    "nomu": (
        "/v2/nomu/prompt-optimize",
        {"prompt": "a cup"},
        "nomu_svc",
        "optimize_prompt",
        lambda: PromptOptimizeResult(prompt="optimized"),
        "nomu_prompt_optimize",
        20,
    ),
}


def _stub(api_app, case):
    """把 case 对应 service 的 LLM 方法换成测试桩，返回记录调用的 list。"""
    _, _, svc_attr, method, factory, _, _ = CASES[case]
    calls: list = []

    async def impl(*args, **kwargs):
        calls.append((args, kwargs))
        return factory()

    setattr(getattr(api_app.state.services, svc_attr), method, impl)
    return calls


def _stub_raising(api_app, case, exc):
    _, _, svc_attr, method, _, _, _ = CASES[case]
    called = False

    async def impl(*args, **kwargs):
        nonlocal called
        called = True
        raise exc

    setattr(getattr(api_app.state.services, svc_attr), method, impl)

    def was_called():
        return called

    return was_called


@pytest_asyncio.fixture
async def broke(api_app, billing, db_session):
    """billing 环境 + 余额改成 5 厘（低于两档价格）。"""
    await db_session.execute(
        update(CreditWallet)
        .where(CreditWallet.user_id == billing)
        .values(balance=5)
    )
    await db_session.flush()
    return billing


async def _txns(db_session, source, biz_id):
    return (
        (
            await db_session.execute(
                select(CreditTransaction).where(
                    CreditTransaction.source == source,
                    CreditTransaction.biz_id == biz_id,
                )
            )
        )
        .scalars()
        .all()
    )


@pytest.mark.parametrize("case", list(CASES))
async def test_insufficient_balance_402_no_llm_call(
    api_app, api_client, broke, db_session, case
):
    """余额 5 厘 < 价格 → 402 信封，LLM 零调用，无 consume 流水。"""
    url, payload = CASES[case][0], CASES[case][1]
    was_called = _stub_raising(api_app, case, AssertionError("must not run"))

    resp = await api_client.post(url, json=payload)

    assert resp.status_code == 402
    assert resp.json()["data"] == {}
    assert was_called() is False
    count = await db_session.scalar(
        select(func.count())
        .select_from(CreditTransaction)
        .where(
            CreditTransaction.user_id == broke,
            CreditTransaction.type == "consume",
        )
    )
    assert count == 0


@pytest.mark.parametrize("case", list(CASES))
async def test_llm_failure_refunds_full(
    api_app, api_client, billing, db_session, case
):
    """LLM 抛错 → 原错误照常抛出 + refund 全额流水，余额复原。"""
    url, payload, _, _, _, source, price = CASES[case]
    was_called = _stub_raising(api_app, case, APIError("upstream down", 502))

    resp = await api_client.post(
        url, json=payload, headers={"Idempotency-Key": f"rf-{case}"}
    )

    assert resp.status_code == 502
    assert resp.json()["message"] == "upstream down"
    assert was_called() is True

    balance, total_spent = (
        await db_session.execute(
            select(CreditWallet.balance, CreditWallet.total_spent).where(
                CreditWallet.user_id == billing
            )
        )
    ).one()
    assert (balance, total_spent) == (1000, 0)

    consume = await _txns(db_session, source, f"rf-{case}")
    assert len(consume) == 1 and consume[0].amount == -price
    refunds = await _txns(db_session, source, f"refund:rf-{case}")
    assert len(refunds) == 1
    assert refunds[0].type == "refund"
    assert refunds[0].amount == price


@pytest.mark.parametrize("case", list(CASES))
async def test_success_consume_and_idempotent_retry(
    api_app, api_client, billing, db_session, case
):
    """成功 → consume 流水 -price（厘）、credits_spent 回显分；
    同 Idempotency-Key 重试不双扣（幂等返回首次流水，响应正常）。"""
    url, payload, _, _, _, source, price = CASES[case]
    calls = _stub(api_app, case)

    headers = {"Idempotency-Key": f"idem-{case}"}
    r1 = await api_client.post(url, json=payload, headers=headers)
    r2 = await api_client.post(url, json=payload, headers=headers)

    assert r1.status_code == r2.status_code == 200
    expected = price / 100  # 厘 → 分
    assert r1.json()["data"]["credits_spent"] == pytest.approx(expected)
    assert r2.json()["data"]["credits_spent"] == pytest.approx(expected)
    # 幂等只约束扣费；LLM 请求重试照常执行
    assert len(calls) == 2

    rows = await _txns(db_session, source, f"idem-{case}")
    assert len(rows) == 1
    assert rows[0].type == "consume"
    assert rows[0].amount == -price
    balance, total_spent = (
        await db_session.execute(
            select(CreditWallet.balance, CreditWallet.total_spent).where(
                CreditWallet.user_id == billing
            )
        )
    ).one()
    assert (balance, total_spent) == (1000 - price, price)


async def test_idempotency_key_overlong_rejected(api_app, api_client, billing):
    """>57 字符的 key 拼上 refund: 前缀会超 varchar(64) → 400 提前拒（校验在 service）。"""
    _stub(api_app, "translate")

    resp = await api_client.post(
        "/v2/translate",
        json={"text": "hi", "targetLanguage": "中文"},
        headers={"Idempotency-Key": "x" * 58},
    )
    assert resp.status_code == 400
    assert "biz_id" in resp.json()["message"]


@pytest.mark.parametrize("prefix", ["refund:", "settle:"])
async def test_idempotency_key_reserved_prefix_rejected(
    api_app, api_client, billing, db_session, prefix
):
    """保留前缀 key → 400，不调 LLM、不产生流水。"""
    was_called = _stub_raising(api_app, "translate", AssertionError("nope"))

    resp = await api_client.post(
        "/v2/translate",
        json={"text": "hi", "targetLanguage": "中文"},
        headers={"Idempotency-Key": f"{prefix}abc"},
    )
    assert resp.status_code == 400
    assert was_called() is False
    count = await db_session.scalar(
        select(func.count()).select_from(CreditTransaction)
    )
    assert count == 0


@pytest.mark.parametrize("case", list(CASES))
async def test_replay_failure_does_not_refund_first_charge(
    api_app, api_client, billing, db_session, case
):
    """重放免单防护：首笔成功交付后，同 key 重放请求失败不得退款。

    第二次 preconsume 幂等命中 (existing, False)，run 失败时 helper 只对
    created=True 挂退款——consume 保持、无 refund 流水、余额仍为已扣。
    """
    url, payload, _, _, _, source, price = CASES[case]
    headers = {"Idempotency-Key": f"replay-{case}"}

    _stub(api_app, case)
    r1 = await api_client.post(url, json=payload, headers=headers)
    assert r1.status_code == 200

    _stub_raising(api_app, case, APIError("upstream down", 502))
    r2 = await api_client.post(url, json=payload, headers=headers)
    assert r2.status_code == 502

    balance, total_spent = (
        await db_session.execute(
            select(CreditWallet.balance, CreditWallet.total_spent).where(
                CreditWallet.user_id == billing
            )
        )
    ).one()
    assert (balance, total_spent) == (1000 - price, price)

    consume = await _txns(db_session, source, f"replay-{case}")
    assert len(consume) == 1 and consume[0].amount == -price
    refunds = await _txns(db_session, source, f"refund:replay-{case}")
    assert refunds == []


async def test_disconnect_refunds(billing, db_session):
    """客户端断连（run 抛 CancelledError）→ shield 退款跑完，余额复原。

    直测 ``call_with_billing``：经 HTTP 层无法稳定注入 CancelledError。
    """
    import asyncio

    from app.api.v2._billing import call_with_billing

    async def _cancel(_biz_id: str):
        raise asyncio.CancelledError

    with pytest.raises(asyncio.CancelledError):
        await call_with_billing(
            db_session, billing, "translate", "drop-1", _cancel
        )

    balance, total_spent = (
        await db_session.execute(
            select(CreditWallet.balance, CreditWallet.total_spent).where(
                CreditWallet.user_id == billing
            )
        )
    ).one()
    assert (balance, total_spent) == (1000, 0)
    consume = await _txns(db_session, "translate", "drop-1")
    assert len(consume) == 1 and consume[0].type == "consume"
    refunds = await _txns(db_session, "translate", "refund:drop-1")
    assert len(refunds) == 1 and refunds[0].type == "refund"
