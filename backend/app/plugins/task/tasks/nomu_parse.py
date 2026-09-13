"""Nomu 通用采集商品解析任务 —— TaskIQ 异步执行。

流程：web 进程在路由内预扣积分（先落盘，见 ``_billing.dispatch_with_billing``）→
本任务消费：单 loop 解析 → 写入用户云端共享池并广播（Go syncbus 契约）→
记录 usage；任何失败（含 ``CancelledError``）全额退款
（``refund`` 自管 PG 会话）后原样上抛，让 TaskIQ 记录失败。
"""

from __future__ import annotations

import asyncio

from taskiq import Context, TaskiqDepends

from app.core.logger import logger
from app.plugins.task.task import broker
from app.schemas.nomu import ProductParseRequest
from app.services.credit_service import refund
from app.services.llm_usage_service import record_llm_usage
from app.services.nomu_collection_pool import (
    build_pool_snapshot,
    build_product_row,
    collection_channel,
    collection_key,
)

# 计费来源唯一 Python 定义处；路由经本模块导入，与 Go credit_price seed 对齐
PARSE_CREDIT_SOURCE = "nomu_product_parse"


@broker.task
async def parse_product_snapshot(
    user_id: int,
    request: dict,
    biz_id: str,
    context: Context = TaskiqDepends(),
) -> dict:
    """解析采集快照并把成品 Product 行写入用户云端池。

    ``request`` 是 :class:`ProductParseRequest` 的 JSON dict（camelCase wire
    形状，跨进程传输后重建）；任何失败按 ``biz_id`` 全额退款后上抛。
    Redis 用 worker 侧 ``context.state.redis``（TaskiqState，WORKER_STARTUP
    装配）——``AppState`` 不持 redis，只持有自管会话的服务。
    """
    state = context.state.services
    redis = context.state.redis
    req = ProductParseRequest.model_validate(request)

    try:
        draft = await state.product_parse_svc.parse(req)
        row = build_product_row(req, draft)
        snap_id, snap_json, update_json = build_pool_snapshot(row)
        await redis.hset(collection_key(user_id), snap_id, snap_json)
        # 广播尽力而为：写入已落地，notify 失败不影响结果（Go 同款纪律）
        await redis.publish(collection_channel(user_id), update_json)
    except asyncio.CancelledError:
        # worker 关停/取消同样是未交付；shield 让退款跑完再随取消退出
        await asyncio.shield(_refund_quietly(user_id, biz_id))
        raise
    except Exception:
        # 解析失败 / 池写入失败 = 未交付，退款后上抛让 TaskIQ 记失败
        await _refund_quietly(user_id, biz_id)
        raise

    usage = draft.usage
    if usage is not None:
        await record_llm_usage(
            source=PARSE_CREDIT_SOURCE,
            model=usage.model,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            total_tokens=usage.total_tokens,
            user_id=user_id,
            duration_ms=usage.duration_ms,
            meta={
                "credit_biz_id": biz_id,
                "snapshot_id": snap_id,
                "source_url": req.source_url,
                "unknown_fields": draft.unknown_fields,
            },
        )

    logger.bind(component="nomu_parse", snapshot_id=snap_id).info(
        "product parse done", source_url=req.source_url
    )
    return {"snapshot_id": snap_id}


async def _refund_quietly(user_id: int, biz_id: str) -> None:
    """退款失败只记日志，不吞掉主流程异常。"""
    try:
        await refund(user_id, PARSE_CREDIT_SOURCE, biz_id)
    except Exception as exc:
        logger.bind(component="nomu_parse").error(
            "refund failed after parse failure", biz_id=biz_id, error=repr(exc)
        )
