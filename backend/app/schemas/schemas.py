"""Backward-compatible re-export module.

All schemas are now defined in individual sub-modules.
This module re-exports everything so that
``from app.schemas.schemas import ...`` continues to work.
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
from app.schemas.devtask import DevTaskCreate, DevTaskOut, DevTaskUpdate
from app.schemas.user import (
    ImageUploadOut,
    UserOut,
    UserProfileOut,
    UserSettingsIn,
    UserSettingsOut,
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
    "EmailCodeContent",
    "EmailCodeIn",
    "EmailSchema",
    "FeishuMessageContent",
    "FeishuRichTextContent",
    "GetComment",
    "GitHubOAuthConfig",
    "HistoryRequest",
    "ImageUploadOut",
    "LoginIn",
    "LoginOut",
    "MessageIn",
    "MessageOut",
    "MessagesOut",
    "PaginationSchema",
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
    "DevTaskCreate",
    "DevTaskOut",
    "DevTaskUpdate",
    "UpdateBookIn",
    "UserOut",
    "UserProfileOut",
    "UserSettingsIn",
    "UserSettingsOut",
]
