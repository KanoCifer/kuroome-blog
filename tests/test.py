import pytest
from sqlalchemy.pool import StaticPool

from watchlist import create_app
from watchlist.extensions import db
from watchlist.models import Book, SignUpCode, User, UserBook


@pytest.fixture()
def app():
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test",
            "WTF_CSRF_ENABLED": False,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "SQLALCHEMY_ENGINE_OPTIONS": {
                "connect_args": {"check_same_thread": False},
                "poolclass": StaticPool,
            },
            "MAIL_SUPPRESS_SEND": True,
        }
    )
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def app_context(app):
    with app.app_context():
        yield


def create_user(username="user1", password="Passw0rd!"):
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def create_book_for_user(user, title="Book", author="Author"):
    book = Book()
    book.title = title
    book.author = author
    db.session.add(book)
    db.session.flush()
    user_book = UserBook()
    user_book.user_id = user.id
    user_book.book_id = book.id
    db.session.add(user_book)
    db.session.commit()
    return book, user_book


def login(client, username="user1", password="Passw0rd!"):
    return client.post(
        "/login",
        data={"username": username, "password": password},
        follow_redirects=False,
    )


def test_index_routes_get(client):
    response = client.get("/")
    assert response.status_code == 200

    response = client.get("/index")
    assert response.status_code == 200


def test_index_post_requires_login(client):
    response = client.post(
        "/",
        data={"title": "Test Book", "author": "Someone"},
        follow_redirects=False,
    )
    assert response.status_code == 302


def test_login_get_and_post_success(client, app_context):
    create_user()

    response = client.get("/login")
    assert response.status_code == 200

    response = login(client)
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/")


def test_login_post_invalid(client):
    response = client.post(
        "/login",
        data={"username": "nouser", "password": "bad"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")


def test_logout_requires_login(client, app_context):
    response = client.get("/logout")
    assert response.status_code == 401

    create_user()
    login(client)
    response = client.get("/logout")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/")


def test_email_code_requires_email(client):
    response = client.get("/email/code")
    assert response.status_code == 400
    assert response.get_json()["status"] == "fail"


def test_email_code_success(client, app_context):
    response = client.get("/email/code?email=test@example.com")
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

    code = db.session.execute(
        db.select(SignUpCode).filter_by(email="test@example.com")
    ).scalar()
    assert code is not None


def test_register_get_and_post_success(client, app_context):
    db.session.add(SignUpCode(email="new@example.com", code="123456"))
    db.session.commit()

    response = client.get("/register")
    assert response.status_code == 200

    response = client.post(
        "/register",
        data={
            "username": "newuser",
            "email": "new@example.com",
            "email_code": "123456",
            "password": "Passw0rd!",
            "confirm_password": "Passw0rd!",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")

    user = db.session.execute(db.select(User).filter_by(username="newuser")).scalar()
    assert user is not None


def test_register_post_existing_user(client, app_context):
    create_user(username="existing")
    db.session.add(SignUpCode(email="exist@example.com", code="654321"))
    db.session.commit()

    response = client.post(
        "/register",
        data={
            "username": "existing",
            "email": "exist@example.com",
            "email_code": "654321",
            "password": "Passw0rd!",
            "confirm_password": "Passw0rd!",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/register")


def test_settings_requires_login(client, app_context):
    response = client.get("/settings")
    assert response.status_code == 401

    user = create_user()
    login(client)

    response = client.get("/settings")
    assert response.status_code == 200

    response = client.post(
        "/settings",
        data={
            "name": "Test User",
            "username": user.username,
            "gender": "Male",
            "email": "u@example.com",
            "mobile": "1234567890",
            "password": "",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/")


def test_upload_pic_requires_login(client, app_context):
    response = client.post("/upload_pic")
    assert response.status_code == 401

    create_user()
    login(client)
    response = client.post("/upload_pic")
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"


def test_bookshelf_requires_login(client, app_context):
    response = client.get("/bookshelf")
    assert response.status_code == 401

    create_user()
    login(client)
    response = client.get("/bookshelf")
    assert response.status_code == 200


def test_import_requires_login(client, app_context):
    response = client.get("/import")
    assert response.status_code == 401

    create_user()
    login(client)
    response = client.get("/import")
    assert response.status_code == 200


def test_book_routes_require_login_and_work(client, app_context):
    user = create_user()
    book, user_book = create_book_for_user(user)

    response = client.get(f"/book/edit/{book.id}")
    assert response.status_code == 401

    response = client.post(f"/book/delete/{book.id}")
    assert response.status_code == 401

    response = client.post(f"/book/toggle/{book.id}")
    assert response.status_code == 401

    login(client)

    response = client.get(f"/book/edit/{book.id}")
    assert response.status_code == 200

    response = client.post(
        f"/book/edit/{book.id}",
        data={"title": "New Title", "author": "New Author"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/")

    response = client.post(
        f"/book/toggle/{book.id}",
        follow_redirects=False,
    )
    assert response.status_code == 302

    db.session.refresh(user_book)
    assert user_book.iscompleted is True

    response = client.post(
        f"/book/delete/{book.id}",
        data={"submit": "Delete"},
        follow_redirects=False,
    )
    assert response.status_code == 302

    remaining = db.session.execute(
        db.select(UserBook).filter_by(user_id=user.id, book_id=book.id)
    ).scalar()
    assert remaining is None
