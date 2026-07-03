from __future__ import annotations

from datetime import UTC, datetime

import faker
from fastapi import Request
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, MappedColumn, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from app.models import Base

# 用于生成随机数据的 Faker 实例
fake = faker.Faker()


# 用户模型
class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    github_id: Mapped[int | None] = mapped_column(
        Integer, unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(
        String(50), default=fake.name, index=True
    )
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))

    # ========== Trackable 功能字段（你重点关注的）==========
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_login_ip: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    current_login_ip: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    login_count: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=False)

    # One-to-One relationship with Profile
    profile: Mapped[Profile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    # 一对多关系与RSS链接
    rss_info: Mapped[list[RssInfo]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[list[Subscription]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    # 一对一关系与PasskeyCredential
    passkey_credential: Mapped[PasskeyCredential | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    # 一对多关系与画廊图片
    gallery_images: Mapped[list[GalleryImage]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __init__(self, *args, **kwargs):
        """允许在初始化时直接传入 password 参数并自动生成哈希值"""
        password = kwargs.pop("password", None)
        super().__init__(*args, **kwargs)
        if password:
            self.raw_password = password  # 通过 setter 自动生成哈希值

    def __repr__(self):
        return f"<User {self.username}>"

    def __hash__(self) -> int:
        # SQLAlchemy 默认按对象身份 hash，导致同 id 的不同实例 hash 不同
        # 缓存 key（如 @redis_cache）需要按业务主键 id 去重
        return hash(self.id) if self.id is not None else id(self)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        if self.id is None or other.id is None:
            return self is other
        return self.id == other.id

    # 获取用户的真实 IP 地址，考虑了代理服务器的情况
    @staticmethod
    def get_real_ip(request: Request) -> str:
        """
        获取客户端真实 IP,处理了反向代理 Nginx 的情况
        """
        # 1. 尝试从 X-Forwarded-For 获取（经过多层代理时，第一个 IP 才是真实客户端）
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # 可能是 "client_ip, proxy1_ip, proxy2_ip" 的格式
            return x_forwarded_for.split(",")[0].strip()

        # 2. 尝试从 X-Real-IP 获取（常见于简单的单层代理配置）
        x_real_ip = request.headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip

        # 3. 直接获取连接方 IP（如果没有代理，或者是直连）
        # 注意：FastAPI 中通过 request.client 获取，它是一个 Address 对象
        return request.client.host if request.client else "127.0.0.1"

    # 验证密码
    def validate_password(self, password):
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self) -> bool:
        """检查用户是否在管理员白名单中，由 settings.ADMIN_USER_IDS 配置。"""
        from app.core.config import settings

        return self.id in settings.ADMIN_USER_IDS

    @property
    def raw_password(self):
        """返回密码哈希值以供验证使用"""
        return self.password_hash

    @raw_password.setter
    def raw_password(self, raw_password):
        """设置密码时自动生成哈希值"""
        self.password_hash = generate_password_hash(raw_password)


# 一对一关系的用户资料模型
class Profile(Base):
    __tablename__ = "profile"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    email: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    # Foreign Key to User (unique=True ensures one-to-one)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), unique=True
    )
    # One-to-One relationship with User
    user: Mapped[User] = relationship(back_populates="profile")
    photo: Mapped[str | None] = mapped_column(
        String(200), nullable=True, default="default.png"
    )

    bark_device_key: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    feishu_webhook_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    # 初始化方法
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<Profile {self.id} - User ID: {self.user_id}>"


class Category(Base):
    """
    博客分类模型
    注意: 文章数据已迁移到 MongoDB, 此模型仅保留用于分类管理
    """

    __tablename__ = "category"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(50), unique=True)

    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f"<Category {self.name}>"


# VisitorTrack模型
class VisitorTrack(Base):
    __tablename__ = "visitor_track"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    visitor_id: Mapped[str] = mapped_column(String(100), index=True)
    page_url: Mapped[str] = mapped_column(String(200))
    page_path: Mapped[str] = mapped_column(String(200))
    referrer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    browser: Mapped[str] = mapped_column(Text)  # User Agent 可能很长
    screen_resolution: Mapped[str] = mapped_column(String(100))
    language: Mapped[str] = mapped_column(String(50))
    ip_address: Mapped[str] = mapped_column(String(100), index=True)
    visit_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    browser_name: Mapped[str] = mapped_column(String(100), nullable=True)
    browser_version: Mapped[str] = mapped_column(String(100), nullable=True)
    os_name: Mapped[str] = mapped_column(String(100), nullable=True)
    os_version: Mapped[str] = mapped_column(String(100), nullable=True)
    cpu: Mapped[str] = mapped_column(String(length=50), nullable=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=True)

    # 联合索引：覆盖查询条件 + 分组字段
    __table_args__ = (
        Index(
            "idx_visit_browser_stats",
            "visit_time",
            "browser_name",
            "browser_version",
        ),
        Index(
            "idx_visit_os_stats",
            "visit_time",
            "os_name",
            "os_version",
        ),
        Index(
            "idx_visit_time_page_path",
            "visit_time",
            "page_path",
        ),
        Index(
            "idx_visit_time_device_type",
            "visit_time",
            "device_type",
        ),
        Index(
            "idx_visit_time_visitor_id",
            "visit_time",
            "visitor_id",
        ),
        Index(
            "idx_visit_time_ip_address",
            "visit_time",
            "ip_address",
        ),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<VisitorTrack {self.ip_address} at {self.visit_time}>"


class RssInfo(Base):
    __tablename__ = "rss_info"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    rss_url: Mapped[str] = mapped_column(String(200), index=True)
    feed_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    feed_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    feed_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    feed_published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    entry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # 一对多关系，一个用户可以有多个RSS链接
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), index=True
    )
    user: Mapped[User] = relationship(back_populates="rss_info")


class PasskeyCredential(Base):
    __tablename__ = "passkey_credential"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    credential_id: Mapped[str] = mapped_column(String(255), unique=True)
    public_key: Mapped[str] = mapped_column(String(500))
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), index=True
    )
    # 一对一
    user: Mapped[User] = relationship(
        back_populates="passkey_credential", uselist=False
    )


class Subscription(Base):
    __tablename__ = "subscription"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)

    price: Mapped[float] = mapped_column(Float, nullable=False)

    currency: Mapped[str] = mapped_column(String(10), nullable=False)

    billing_cycle: Mapped[str] = mapped_column(
        Enum("monthly", "quarterly", "yearly", name="billing_cycle_enum"),
        nullable=False,
    )

    next_billing_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    status: Mapped[str] = mapped_column(
        Enum(
            "active",
            "canceled",
            "paused",
            "expired",
            name="subscription_status_enum",
        ),
        nullable=False,
    )
    reminder_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), index=True
    )
    user: Mapped[User] = relationship(back_populates="subscriptions")


class DeviceTrack(Base):
    __tablename__ = "device_track"
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    purchase_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    price: Mapped[float] = mapped_column(Float)
    currency: MappedColumn[str] = mapped_column(String(10), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    status: Mapped[str] = mapped_column(
        Enum("active", "retired", name="device_status_enum"),
        nullable=False,
    )
    reminder_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class GalleryImage(Base):
    """持久化的画廊图片记录"""

    __tablename__ = "gallery_image"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(String(500), default="")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(50), default="image/jpeg")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, index=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    exif: Mapped[dict[str, str] | None] = mapped_column(
        JSON, default=None
    )

    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("user.id"), nullable=True, index=True
    )
    user: Mapped[User | None] = relationship(back_populates="gallery_images")
