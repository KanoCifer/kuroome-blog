from __future__ import annotations

import hashlib
import json

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from redis.asyncio import Redis as AsyncRedis

from app.dependencies.redis import get_redis
from app.schemas.response import APIResponse
from app.utils.agent import article_summarizer

router = APIRouter(prefix="/agent", tags=["agent"])


class ArticleSummaryRequest(BaseModel):
    content: str = Field(min_length=1, description="文章正文")
    title: str | None = Field(default=None, description="文章标题")


def make_cache_key(content: str, title: str | None = None) -> str:
    """根据内容生成唯一的缓存 key"""
    text = f"{title or ''}:{content}"
    hash_val = hashlib.md5(text.encode(), usedforsecurity=False).hexdigest()
    return f"article_summary:{hash_val}"


async def save_cache_to_redis(
    redis: AsyncRedis, key: str, value: str, expire: int = 3600
):
    """将总结结果存储到 Redis,设置过期时间为 1 小时"""
    await redis.set(key, value, ex=expire)


@router.post("/summary")
async def summary_article(
    tasks: BackgroundTasks,
    payload: ArticleSummaryRequest,
    redis: AsyncRedis = Depends(get_redis),
):
    cache_key = make_cache_key(payload.content, payload.title)
    cached_summary = await redis.get(cache_key)
    if cached_summary:
        return APIResponse.ok(
            data={"summary": cached_summary},
            message="文章总结（缓存）生成成功",
        )
    try:
        summary = await article_summarizer.summarize_article(
            content=payload.content,
            title=payload.title,
        )
        tasks.add_task(
            save_cache_to_redis,
            redis,
            cache_key,
            summary,
        )
        return APIResponse.ok(
            data={"summary": summary},
            message="文章总结生成成功",
        )
    except ValueError as exc:
        return APIResponse.error(message=str(exc), code=400)
    except RuntimeError as exc:
        return APIResponse.error(message=str(exc), code=503)
    except Exception:
        return APIResponse.error(message="文章总结失败,请稍后重试", code=500)


@router.post("/summary/stream")
async def summary_article_stream(
    tasks: BackgroundTasks,
    payload: ArticleSummaryRequest,
    redis: AsyncRedis = Depends(get_redis),
):
    cache_key = make_cache_key(payload.content, payload.title)
    cached_summary = await redis.get(cache_key)

    async def event_generator():
        if cached_summary:
            data = {
                "content": cached_summary,
                "is_end": True,
            }
            yield f"data:{json.dumps(data, ensure_ascii=False)}\n\n"
            yield f"data:{json.dumps({'content': '', 'is_end': True}, ensure_ascii=False)}\n\n"
            return

        full_summary = ""
        try:
            async for chunk in article_summarizer.summarize_article_stream(
                content=payload.content,
                title=payload.title,
            ):
                data = {
                    "content": chunk,
                    "is_end": False,
                }
                full_summary += chunk
                yield f"data:{json.dumps(data, ensure_ascii=False)}\n\n"

            done = {
                "content": "",
                "is_end": True,
            }
            yield f"data:{json.dumps(done, ensure_ascii=False)}\n\n"

            if full_summary:
                tasks.add_task(
                    save_cache_to_redis,
                    redis,
                    cache_key,
                    full_summary,
                )
        except ValueError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!s}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except RuntimeError as e:
            yield f"data:{json.dumps({'content': f'[ERROR] {e!s}', 'is_end': True}, ensure_ascii=False)}\n\n"
        except Exception:
            yield f"data:{json.dumps({'content': '[ERROR] 文章总结失败,请稍后重试', 'is_end': True}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
