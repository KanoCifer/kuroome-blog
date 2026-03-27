from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, Response

from app.api.des.auth import manager
from app.api.des.des import rss_service_dep
from app.core.logger import logger
from app.models.models import User
from app.schemas.response import APIResponse
from app.schemas.schemas import (
    RssRequest,
)
from app.services.rss_service import (
    RssDomainError,
    RssService,
    _is_forbidden_target,
)

router = APIRouter(prefix="/rss", tags=["rss"])
_IMAGE_PROXY_TIMEOUT = httpx.Timeout(15.0, connect=10.0)
_IMAGE_PROXY_MAX_BYTES = 10 * 1024 * 1024  # 10MB


@router.get("/image-proxy")
async def proxy_rss_image(
    url: str = Query(..., min_length=8, max_length=2048),
    user: User = Depends(manager),
):
    """代理 RSS 图片, 避免浏览器直接跨域加载失败。"""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return APIResponse.error(
            message="仅支持 http/https 图片地址", code=400
        )
    if not parsed.hostname or await _is_forbidden_target(parsed.hostname):
        return APIResponse.error(message="不允许访问该图片地址", code=400)

    try:
        async with httpx.AsyncClient(
            timeout=_IMAGE_PROXY_TIMEOUT,
            follow_redirects=True,
        ) as client:
            upstream = await client.get(url)
    except httpx.HTTPError:
        return APIResponse.error(message="拉取图片失败", code=502)

    if upstream.status_code >= 400:
        return APIResponse.error(message="拉取图片失败", code=502)

    content_type = upstream.headers.get("content-type", "")
    if not content_type.lower().startswith("image/"):
        return APIResponse.error(message="目标资源不是图片", code=400)

    content = upstream.content
    if len(content) > _IMAGE_PROXY_MAX_BYTES:
        return APIResponse.error(message="图片过大，超过 10MB", code=413)

    headers = {
        "Cache-Control": "public, max-age=3600",
    }
    if upstream.headers.get("etag"):
        headers["ETag"] = upstream.headers["etag"]
    if upstream.headers.get("last-modified"):
        headers["Last-Modified"] = upstream.headers["last-modified"]

    return Response(
        content=content,
        media_type=content_type.split(";")[0].strip(),
        headers=headers,
    )


# 解析RSS链接
@router.post("/parse-rss")
async def parse_rss(
    rss_request: RssRequest,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """解析RSS链接返回RSS内容"""

    rss_url = rss_request.rss_url
    save_to_db = rss_request.save_to_db
    rss_info = None

    if save_to_db:
        try:
            rss_info = await rss_service.save_rss_info(
                url=rss_url, user_id=current_user.id
            )
            logger.info(
                f"用户 {current_user.username} 保存了RSS链接: {rss_url}"
            )
        except RssDomainError as exc:
            return APIResponse.error(message=exc.message, code=exc.code)

    if not save_to_db:
        cached_payload = await rss_service.get_cached_feed(rss_url)
        if cached_payload:
            return APIResponse.ok(data=cached_payload)

    try:
        result = await rss_service.fetch_and_parse_feed(
            url=rss_url, save_to_db=save_to_db, rss_info=rss_info
        )
    except RssDomainError as exc:
        logger.error(f"解析RSS链接失败: {exc!r}")
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        logger.error(f"解析RSS链接失败: {exc!r}")
        return APIResponse.error(message=f"解析RSS链接失败: {exc!r}", code=500)
    feed_meta = result["feed_meta"]
    entries = result["entries"]

    if save_to_db:
        try:
            await rss_service.save_entries_to_mongo(
                feed_url=rss_url,
                entries=entries,
            )
        except RssDomainError as exc:
            logger.error(
                "将RSS条目保存到MongoDB失败: user=%s, url=%s, error=%s",
                current_user.id,
                rss_url,
                exc.message,
            )

    await rss_service.set_cached_feed(
        url=rss_url,
        feed_meta=feed_meta,
        entries=entries,
    )

    return APIResponse.ok(data={"meta": feed_meta, "entries": entries})


@router.get("/articles")
async def get_articles(
    page: int = 1,
    limit: int = 20,
    feed_url: str | None = None,
    search: str | None = Query(None, min_length=1),
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
) -> JSONResponse:
    result = await rss_service.get_articles_for_user(
        user_id=current_user.id,
        page=page,
        limit=limit,
        feed_url=feed_url,
        search=search,
    )
    return APIResponse.ok(data=result.model_dump())


@router.get("/articles/{article_id}")
async def get_article(
    article_id: str,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    try:
        response = await rss_service.get_article_for_user(
            article_id=article_id,
            user_id=current_user.id,
        )
        return APIResponse.ok(data=response.model_dump())
    except RssDomainError as exc:
        logger.warning(
            "获取 RSS 文章失败: user=%s, article_id=%s, error=%s",
            current_user.id,
            article_id,
            exc.message,
        )
        return APIResponse.error(message=exc.message, code=exc.code)


# 获取当前用户的RSS订阅列表
@router.get("/subscriptions")
async def get_subscriptions(
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """获取当前用户的RSS订阅列表"""
    subscriptions = await rss_service.get_subscriptions_for_user(
        user_id=current_user.id
    )
    data = [sub.model_dump() for sub in subscriptions]
    return APIResponse.ok(data=data)


# 手动刷新某个RSS订阅，拉取并保存最新文章
@router.post("/subscriptions/{subscription_id}/refresh")
async def refresh_subscription(
    subscription_id: int,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """手动刷新指定订阅并保存新文章"""
    try:
        result = await rss_service.refresh_subscription(
            subscription_id=subscription_id,
            user_id=current_user.id,
        )

        logger.info(
            "用户 %s 手动刷新RSS: %s, 新增 %s 篇文章",
            current_user.username,
            result["rss_url"],
            result["saved_count"],
        )
        return APIResponse.ok(data=result)
    except RssDomainError as exc:
        logger.warning(
            "手动刷新 RSS 失败: user=%s, subscription_id=%s, error=%s",
            current_user.id,
            subscription_id,
            exc.message,
        )
        return APIResponse.error(message=exc.message, code=exc.code)
    except Exception as exc:
        logger.error(f"手动刷新RSS失败: {exc!r}")
        return APIResponse.error(message=f"手动刷新RSS失败: {exc!r}", code=500)


# 删除RSS订阅及其所有文章
@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: int,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """删除RSS订阅及其关联的所有文章"""
    try:
        rss_url = await rss_service.delete_subscription_for_user(
            subscription_id=subscription_id,
            user_id=current_user.id,
        )
        logger.info(f"用户 {current_user.username} 删除了RSS订阅: {rss_url}")
        return APIResponse.ok(data={"message": "订阅已删除"})
    except RssDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)


# 标记文章为已读
@router.post("/articles/{article_id}/read")
async def mark_article_read(
    article_id: str,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """标记文章为已读(将用户ID添加到read_by列表,使用$addToSet实现幂等性)"""
    try:
        await rss_service.mark_article_read_state(
            article_id=article_id,
            user_id=current_user.id,
            read=True,
        )
    except RssDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    logger.info(f"用户 {current_user.id} 标记文章 {article_id} 为已读")
    return APIResponse.ok(data={"message": "文章已标记为已读"})


# 标记文章为未读
@router.delete("/articles/{article_id}/read")
async def mark_article_unread(
    article_id: str,
    current_user: User = Depends(manager),
    rss_service: RssService = Depends(rss_service_dep),
):
    """标记文章为未读(从read_by列表中移除用户ID)"""
    try:
        await rss_service.mark_article_read_state(
            article_id=article_id,
            user_id=current_user.id,
            read=False,
        )
    except RssDomainError as exc:
        return APIResponse.error(message=exc.message, code=exc.code)

    logger.info(f"用户 {current_user.id} 标记文章 {article_id} 为未读")
    return APIResponse.ok(data={"message": "文章已标记为未读"})
