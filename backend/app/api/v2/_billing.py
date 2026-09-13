"""v2 AI 端点共享计费编排 —— translate / nomu 等按次扣费端点的统一骨架。

流程：幂等键缺省 uuid4 → ``preconsume`` 预扣（校验/402/404 直接上抛，
不产生扣费）→ ``commit`` 让扣费先落盘（进程崩溃不白嫖模型）→ 执行 ``run``。
失败时全额退款并 ``commit`` 后原样 re-raise（退款流水必须活过依赖回滚）。

两条纪律（spec task-549 安全修复）：

1. 只对 ``created=True`` 的首次扣费挂退款。幂等重放（``created=False``）
   失败不得退掉首笔已成功交付的扣费，否则重放请求即免单。
2. ``asyncio.CancelledError`` 单独接住并 ``shield`` 退款——客户端中途断开
   是取消而非 Exception，``except Exception`` 接不住，漏接则扣费不退。
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credit import CreditTransaction
from app.services.credit_service import preconsume, refund


async def call_with_billing[T](
    session: AsyncSession,
    user_id: int,
    source: str,
    idem_key: str | None,
    run: Callable[[str], Awaitable[T]],
) -> tuple[T, CreditTransaction]:
    """预扣 → 执行业务 ``run(biz_id)`` → 返回 ``(结果, consume 流水)``。

    ``idem_key``（客户端幂等键，可为 None/空）缺省服务端生成 uuid4 hex；
    实际使用的 biz_id 透传给 ``run``（服务层记入 ``llm_usage.meta``）。
    任何业务异常/取消：首扣（``created=True``）则退款复原后原样上抛。
    """
    biz_id = idem_key or uuid4().hex

    # 预扣：InvalidBizIDError / InsufficientBalanceError /
    # CreditPriceNotFoundError 直接向上抛（400/402/404）。此时没扣成功，不退。
    txn, created = await preconsume(
        user_id, source, "", 1, biz_id, session=session
    )
    # 扣费先落盘再调业务：进程中途崩溃也不会白嫖模型；失败靠 refund 补平。
    await session.commit()

    async def _refund_and_commit() -> None:
        await refund(user_id, source, biz_id, session=session)
        # 退款流水必须活过随后的 raise + 依赖回滚
        await session.commit()

    try:
        result = await run(biz_id)
    except asyncio.CancelledError:
        if created:
            # shield：任务已被取消，await 点仍会抛 CancelledError，但退款
            # 作为独立 task 跑完，用户断开不再留下已扣费未交付的坏账。
            await asyncio.shield(_refund_and_commit())
        raise
    except Exception:
        if created:
            await _refund_and_commit()
        raise

    return result, txn


async def dispatch_with_billing(
    session: AsyncSession,
    user_id: int,
    source: str,
    idem_key: str | None,
    dispatch: Callable[[str], Awaitable[str | None]],
) -> tuple[CreditTransaction, bool, str | None]:
    """异步任务受理版计费编排 —— 预扣 → commit → 派发 TaskIQ → 返回回执。

    与 :func:`call_with_billing` 的差异：``dispatch(biz_id)`` 只做任务派发
    （快速返回，业务在 worker 内执行，业务失败的退款由任务侧承担，见
    ``tasks/nomu_parse.py``），本函数只对**派发本身**的失败/取消退款。

    纪律一（重放）：``created=False``（幂等键命中）时**不再派发也不退款**
    ——首笔扣费已随首次派发交付，重放请求失败不得退掉它。返回的
    ``job_id`` 为 None，调用方以 ``txn.biz_id`` 作为受理回执引用。

    返回 ``(流水, created, job_id)``：``job_id`` 由 ``dispatch`` 返回
    （如 TaskIQ task_id），重放时为 None。
    """
    biz_id = idem_key or uuid4().hex
    txn, created = await preconsume(user_id, source, "", 1, biz_id, session=session)
    # 扣费先落盘再派发：进程中途崩溃也不会白嫖模型；派发失败靠 refund 补平
    await session.commit()

    async def _refund_and_commit() -> None:
        await refund(user_id, source, biz_id, session=session)
        await session.commit()

    job_id: str | None = None
    try:
        if created:
            job_id = await dispatch(biz_id)
    except asyncio.CancelledError:
        if created:
            await asyncio.shield(_refund_and_commit())
        raise
    except Exception:
        if created:
            await _refund_and_commit()
        raise

    return txn, created, job_id
