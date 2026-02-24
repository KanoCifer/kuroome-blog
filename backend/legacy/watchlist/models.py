from __future__ import annotations

from datetime import UTC, datetime

import faker
from flask import request
from flask_login import UserMixin
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from watchlist.extensions import db

# 用于生成随机数据的 Faker 实例
fake = faker.Faker()

# # 多对多关联表，连接用户和书籍
# user_book = db.Table(
#     "user_book",
#     db.Column("user_id", db.ForeignKey("user.id"), primary_key=True),
#     db.Column("book_id", db.ForeignKey("book.id"), primary_key=True),
# )


# 多对多关联模型，连接用户和书籍，包含额外字段
class UserBook(db.Model):
    __tablename__ = "user_book"
    user_id: Mapped[int] = mapped_column(
        db.ForeignKey("user.id"), primary_key=True, index=True
    )
    book_id: Mapped[int] = mapped_column(
        db.ForeignKey("book.id"), primary_key=True, index=True
    )
    iscompleted: Mapped[bool] = mapped_column(default=False)
    add_date: Mapped[datetime | None] = mapped_column(
        db.DateTime,
        default=lambda: datetime.now(UTC),
        nullable=True,
        index=True,
    )
    update_date: Mapped[datetime] = mapped_column(
        db.DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        index=True,
    )
    # Relationships
    user: Mapped[User] = relationship(
        back_populates="user_book", lazy="joined"
    )
    book: Mapped[Book] = relationship(
        back_populates="user_book", lazy="joined"
    )

    def __init__(
        self,
        user_id: int,
        book_id: int,
        iscompleted: bool = False,
        add_date: datetime | None = None,
    ):
        self.user_id = user_id
        self.book_id = book_id
        self.iscompleted = iscompleted
        self.add_date = add_date or datetime.now(UTC)

    def __repr__(self):
        return f"<UserBook User ID: {self.user_id}, Book ID: {self.book_id}>"


# 用户模型
class User(db.Model, UserMixin):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(
        String(50), default=fake.name(), index=True
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))

    # One-to-One relationship with Profile
    profile: Mapped[Profile | None] = relationship(
        back_populates="user", uselist=False
    )
    # 多对多关系与书籍
    user_book: Mapped[list[UserBook]] = relationship(back_populates="user")

    # Admin fields (merged from Admin model)
    blog_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    blog_sub_title: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_css: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_js: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ========== Trackable 功能字段（你重点关注的）==========
    last_login_at: Mapped[datetime | None] = mapped_column(
        db.DateTime, nullable=True
    )
    current_login_at: Mapped[datetime | None] = mapped_column(
        db.DateTime, nullable=True
    )
    last_login_ip: Mapped[str | None] = mapped_column(
        db.String(100), nullable=True
    )
    current_login_ip: Mapped[str | None] = mapped_column(
        db.String(100), nullable=True
    )
    login_count: Mapped[int] = mapped_column(db.Integer, default=0)
    active: Mapped[bool] = mapped_column(db.Boolean, default=False)

    def __init__(self, username: str):
        self.username = username

    def __repr__(self):
        return f"<User {self.username}>"

    # 获取用户的真实 IP 地址，考虑了代理服务器的情况
    @staticmethod
    def get_real_ip():
        ip = request.headers.get("X-Forwarded-For")
        if ip:
            ip = ip.split(",")[0].strip()
        else:
            ip = request.headers.get("X-Real-IP", request.remote_addr)
        return ip

    # 设置密码，存储哈希值
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # 验证密码
    def validate_password(self, password):
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self) -> bool:
        """检查用户是否为管理员(id=1的用户为管理员)"""
        return self.id == 1


# 一对一关系的用户资料模型
class Profile(db.Model):
    __tablename__ = "profile"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(15), nullable=True)
    # Foreign Key to User
    user_id: Mapped[int] = mapped_column(db.ForeignKey("user.id"), index=True)
    # One-to-One relationship with User
    user: Mapped[User] = relationship(back_populates="profile")
    photo: Mapped[str | None] = mapped_column(
        String(200), nullable=True, default="default.png"
    )

    # 初始化方法
    def __init__(self, user_id: int):
        self.user_id = user_id

    def __repr__(self):
        return f"<Profile {self.id} - User ID: {self.user_id}>"


# 书籍模型
class Book(db.Model):
    __tablename__ = "book"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    author: Mapped[str] = mapped_column(String(60), index=True)
    bookid: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )
    cover: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # 多对多关系与用户
    user_book: Mapped[list[UserBook]] = relationship(back_populates="book")

    def __init__(
        self,
        title: str,
        author: str,
        bookid: str | None = None,
        cover: str | None = None,
    ):
        self.title = title
        self.author = author
        self.bookid = bookid or None
        self.cover = cover or None

    def __repr__(self):
        return f"<Book {self.title} by {self.author}>"


class Category(db.Model):
    """
    博客分类模型
    注意: 文章数据已迁移到 MongoDB, 此模型仅保留用于分类管理
    """

    __tablename__ = "category"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f"<Category {self.name}>"


# 注册码模型
class SignUpCode(db.Model):
    __tablename__ = "signup_code"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    code: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(
        db.DateTime, default=datetime.now, index=True
    )

    def __init__(self, email: str, code: str):
        self.email = email
        self.code = code
