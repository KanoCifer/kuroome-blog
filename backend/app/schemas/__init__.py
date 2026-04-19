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
from app.schemas.book import (
    AddBookIn,
    BookOut,
    BookQuery,
    BooksOut,
    BookStatusIn,
    UpdateBookIn,
)
from app.schemas.category import CategoriesOut, CategoryOut
from app.schemas.comment import (
    AdminCommentOut,
    AdminCommentsOut,
    CommentOut,
    CommentsOut,
    GetComment,
    PostComment,
)
from app.schemas.email import BootstrapEmailContent, EmailCodeContent
from app.schemas.feishu import FeishuMessageContent, FeishuRichTextContent
from app.schemas.message import (
    AdminMessageOut,
    AdminMessagesOut,
    MessageIn,
    MessageOut,
    MessagesOut,
)
from app.schemas.pagination import PaginationSchema
from app.schemas.rss import (
    RssArticleListResponse,
    RssArticleResponse,
    RssMarkReadRequest,
    RssRequest,
    RssSubscriptionResponse,
)
from app.schemas.todo import TodoIn, TodoOut, TodoUpdate
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
    "AddBookIn",
    "AdminCommentOut",
    "AdminCommentsOut",
    "AdminMessageOut",
    "AdminMessagesOut",
    "ArticleSummaryRequest",
    "BlogIn",
    "BlogPostDelete",
    "BlogPostGet",
    "BlogPostIn",
    "BlogPostUpdate",
    "BookOut",
    "BookQuery",
    "BookStatusIn",
    "BooksOut",
    "BootstrapEmailContent",
    "CategoriesOut",
    "CategoryIn",
    "CategoryOut",
    "ChatRequest",
    "CommentOut",
    "CommentsOut",
    "CurrentWeather",
    "DailyForecast",
    "DailyWeather",
    "EmailCodeContent",
    "EmailCodeIn",
    "EmailSchema",
    "FeishuMessageContent",
    "FeishuRichTextContent",
    "GetComment",
    "GitHubOAuthConfig",
    "HistoryRequest",
    "HourlyForecast",
    "HourlyWeather",
    "ImageUploadOut",
    "IndexItem",
    "IndicesData",
    "LoginIn",
    "LoginOut",
    "MessageIn",
    "MessageOut",
    "MessagesOut",
    "NowWeather",
    "PaginationSchema",
    "PasskeyAuthenticationRequest",
    "PasskeyRegistrationRequest",
    "PostComment",
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
    "TodoIn",
    "TodoOut",
    "TodoUpdate",
    "UpdateBookIn",
    "UserOut",
    "UserProfileOut",
    "UserSettingsIn",
    "UserSettingsOut",
    "VisitorData",
    "WeatherData",
    "WeatherRefer",
    "WeatherResponse",
]
