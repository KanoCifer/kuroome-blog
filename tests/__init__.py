import unittest

from watchlist import create_app, db
from watchlist.models import Category, User


class TestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("test")
        self.context = self.app.app_context()
        self.context.push()
        self.client = self.app.test_client()
        self.cli_runner = self.app.test_cli_runner()

        db.create_all()
        # id=1 的用户是管理员
        self.user = User(username="admin")
        self.user.set_password("Passw0rd!")
        self.user.blog_title = "Test Blog"
        self.user.blog_sub_title = "A test blog for unit testing."
        self.user.about = "This is a test admin."
        self.category = Category(name="Test Category")
        self.normal_user = User(username="testuser")
        self.normal_user.set_password("Passw0rd!")

        db.session.add_all([self.user, self.category, self.normal_user])
        db.session.commit()

    def tearDown(self):
        db.drop_all()
        self.context.pop()


class TestSetupData(TestCase):
    def test_setup_creates_records(self):
        admin_user = db.session.execute(
            db.select(User).where(User.id == 1)
        ).scalar_one_or_none()
        category = db.session.execute(db.select(Category)).scalar_one_or_none()
        user = db.session.execute(db.select(User)).scalar_one_or_none()

        self.assertIsNotNone(admin_user)
        self.assertIsNotNone(category)
        self.assertIsNotNone(user)
