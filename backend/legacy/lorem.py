from __future__ import annotations

import random

from faker import Faker

from watchlist.extensions import db
from watchlist.models import Category, User

fake = Faker("zh_CN")


def init_admin():
    """Initialize admin user with default settings."""
    from sqlalchemy import select

    result = db.session.execute(
        select(User).where(User.id == 1)
    ).scalar_one_or_none()
    if result:
        result.name = "Kuroome"
        result.blog_title = "My Watchlist and Blog"
        result.blog_sub_title = "A simple watchlist and blog built with Flask."
        result.about = "This is the about page."
        db.session.commit()


def init_categories_production() -> list[Category]:
    """Initialize default categories for production environment."""
    default_categories = [
        "Python",
        "Web Development",
        "经济学文学",
        "生活",
        "其他",
    ]

    categories = []
    for cat_name in default_categories:
        from sqlalchemy import select

        category = db.session.execute(
            select(Category).where(Category.name == cat_name)
        ).scalar_one_or_none()
        if not category:
            category = Category(name=cat_name)
            db.session.add(category)
            categories.append(category)

    db.session.commit()
    return categories


def init_categories_batch(count: int = 5) -> list[Category]:
    """Batch create categories."""
    categories = []
    category_names = set()

    for _ in range(count):
        name = fake.word() + fake.word()
        while name in category_names:
            name = fake.word() + fake.word()
        category_names.add(name)
        category = Category(name=name)
        db.session.add(category)
        categories.append(category)

    db.session.commit()
    return categories


def init_posts_batch(count: int = 20, category_count: int = 5) -> list[dict]:
    """Batch create blog posts in MongoDB.

    Args:
        count: Number of posts to create
        category_count: Number of categories to use

    Returns:
        List of created post documents
    """
    from watchlist.extensions import mongo
    from watchlist.mongo_utils import create_post

    if mongo is None:
        return []

    posts = []
    categories = init_categories_batch(category_count)

    mgdb = mongo["post"]

    for i in range(count):
        title = fake.sentence(nb_words=random.randint(4, 10))
        paragraphs = fake.paragraphs(nb=random.randint(3, 8))
        body = "\n\n".join(paragraphs)
        category = random.choice(categories)

        try:
            post = create_post(
                mgdb,
                legacy_id=int(fake.unix_time() + i),
                category_id=category.id,
                author_id=1,
                title=title,
                body=body,
            )
            posts.append(post)
        except Exception:
            pass

    return posts


def init_comments_batch(
    count: int = 50,
    post_count: int = 20,
) -> list[dict]:
    """Batch create comments in MongoDB.

    Args:
        count: Number of comments to create
        post_count: Number of posts to associate with

    Returns:
        List of created comment documents
    """
    from bson import ObjectId

    from watchlist.extensions import mongo

    if mongo is None:
        return []

    comments = []
    mgdb = mongo["post"]

    posts = list(mgdb.posts.find().limit(post_count))
    if len(posts) < post_count:
        posts = init_posts_batch(post_count - len(posts))

    if not posts:
        return []

    for _ in range(count):
        post = random.choice(posts)
        comment_doc = {
            "_id": ObjectId(),
            "author": fake.name(),
            "email": fake.email(),
            "site": fake.url() if random.random() > 0.5 else None,
            "body": fake.paragraph(nb_sentences=random.randint(1, 5)),
            "created_at": fake.date_time_this_year(),
            "from_admin": random.random() > 0.9,
            "reviewed": random.random() > 0.2,
            "replied_id": None,
        }

        mgdb.posts.update_one(
            {"_id": post["_id"]},
            {"$push": {"comments": comment_doc}},
        )
        comments.append(comment_doc)

    reply_count = count // 4
    for _ in range(reply_count):
        if not comments:
            break
        parent_comment = random.choice(comments)
        parent_id = parent_comment.get("_id")

        reply_doc = {
            "_id": ObjectId(),
            "author": fake.name(),
            "email": fake.email(),
            "site": fake.url() if random.random() > 0.5 else None,
            "body": f"Reply to comment: {fake.sentence()}",
            "created_at": fake.date_time_this_year(),
            "from_admin": random.random() > 0.8,
            "reviewed": True,
            "replied_id": str(parent_id) if parent_id else None,
        }

        posts_with_comments = list(
            mgdb.posts.find({"comments._id": parent_id})
        )
        if posts_with_comments:
            mgdb.posts.update_one(
                {"_id": posts_with_comments[0]["_id"]},
                {"$push": {"comments": reply_doc}},
            )
            comments.append(reply_doc)

    return comments


def init_all_lorem_data(
    categories: int = 5,
    posts: int = 20,
    comments: int = 50,
):
    """Initialize all fake data.

    Args:
        categories: Number of categories
        posts: Number of posts
        comments: Number of comments
    """
    from sqlalchemy import select

    user = db.session.execute(
        select(User).where(User.id == 1)
    ).scalar_one_or_none()
    if user and not user.is_admin:
        init_admin()

    print("Creating categories...")
    init_categories_batch(categories)

    print(f"Creating {posts} posts...")
    init_posts_batch(posts)

    print(f"Creating {comments} comments...")
    init_comments_batch(comments)

    print("All lorem data created successfully!")
