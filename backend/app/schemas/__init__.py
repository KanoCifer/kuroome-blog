"""Pydantic schemas package.

This package re-exports all schemas for convenient importing.
Use ``from app.schemas import <SchemaName>`` or import from sub-modules directly.
"""

from app.schemas.aiagent import (
    ArticleSummaryRequest,
    ChatRequest,
    HistoryRequest,
    SummaryInput,
)
from app.schemas.auth import (
    EmailCodeIn,
    EmailSchema,
    GitHubOAuthConfig,
    LoginIn,
    LoginOut,
    PasskeyAuthRequest,
    PasskeyRegistrationRequest,
    RegisterIn,
    RegisterOut,
)
from app.schemas.blog import (
    BlogIn,
    BlogPostDelete,
    BlogPostGet,
    BlogPostIn,
    BlogPostUpdate,
    CategoryIn,
)
from app.schemas.category import CategoriesOut, CategoryOut
from app.schemas.devtask import DevTaskCreate, DevTaskOut, DevTaskUpdate
from app.schemas.email import BootstrapEmailContent, EmailCodeContent
from app.schemas.feishu import FeishuMessageContent, FeishuRichTextContent
from app.schemas.log import LogResponse
from app.schemas.moment import (
    MomentAttachmentIn,
    MomentAttachmentOut,
    MomentCreate,
    MomentListOut,
    MomentLocationIn,
    MomentLocationOut,
    MomentOut,
    MomentUpdate,
)
from app.schemas.pagination import PaginationSchema
from app.schemas.rss import (
    RssArticleListResponse,
    RssArticleResponse,
    RssMarkReadRequest,
    RssRequest,
    RssSubscriptionResponse,
)
from app.schemas.track import VisitorData
from app.schemas.user import (
    ImageUploadOut,
    UserOut,
    UserProfileOut,
    UserSettingsIn,
    UserSettingsOut,
)
from app.schemas.weather import (
    CurrentWeather,
    DailyForecast,
    DailyWeather,
    HourlyForecast,
    HourlyWeather,
    IndexItem,
    IndicesData,
    NowWeather,
    TideData,
    TideHourly,
    TideItem,
    WeatherData,
    WeatherRefer,
    WeatherResponse,
)

__all__ = [
    "ArticleSummaryRequest",
    "BlogIn",
    "BlogPostDelete",
    "BlogPostGet",
    "BlogPostIn",
    "BlogPostUpdate",
    "BootstrapEmailContent",
    "CategoriesOut",
    "CategoryIn",
    "CategoryOut",
    "ChatRequest",
    "CurrentWeather",
    "DailyForecast",
    "DailyWeather",
    "DevTaskCreate",
    "DevTaskOut",
    "DevTaskUpdate",
    "EmailCodeContent",
    "EmailCodeIn",
    "EmailSchema",
    "FeishuMessageContent",
    "FeishuRichTextContent",
    "GitHubOAuthConfig",
    "HistoryRequest",
    "HourlyForecast",
    "HourlyWeather",
    "ImageUploadOut",
    "IndexItem",
    "IndicesData",
    "LogResponse",
    "LoginIn",
    "LoginOut",
    "MomentAttachmentIn",
    "MomentAttachmentOut",
    "MomentCreate",
    "MomentListOut",
    "MomentLocationIn",
    "MomentLocationOut",
    "MomentOut",
    "MomentUpdate",
    "NowWeather",
    "PaginationSchema",
    "PasskeyAuthRequest",
    "PasskeyRegistrationRequest",
    "RegisterIn",
    "RegisterOut",
    "RssArticleListResponse",
    "RssArticleResponse",
    "RssMarkReadRequest",
    "RssRequest",
    "RssSubscriptionResponse",
    "SummaryInput",
    "TideData",
    "TideHourly",
    "TideItem",
    "UserOut",
    "UserProfileOut",
    "UserSettingsIn",
    "UserSettingsOut",
    "VisitorData",
    "WeatherData",
    "WeatherRefer",
    "WeatherResponse",
]
