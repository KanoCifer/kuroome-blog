import os

from apiflask import APIFlask
from flask import jsonify
from flask_compress import Compress
from flask_login import current_user
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from watchlist.api import api
from watchlist.config import config
from watchlist.extensions import (
    cache,
    csrf,
    db,
    login_manager,
    mail,
    migrate,
    mongo,
)
from watchlist.models import User


def create_app(test_config=None):
    app = APIFlask(__name__, version="1.0")
    config_name = os.getenv("FLASK_CONFIG", "dev")
    app.config.from_object(config[config_name])

    if test_config:
        app.config.update(test_config)

    register_extensions(app)
    register_blueprints(app)
    register_errors(app)

    indexes_created = False

    @app.before_request
    def create_mongo_indexes():
        nonlocal indexes_created
        if not indexes_created and mongo.db is not None:
            try:
                mongo.db.message_board.create_index([("review", 1)])
                mongo.db.message_board.create_index([("created_at", -1)])
                mongo.db.posts.create_index([("created_at", -1)])
                mongo.db.posts.create_index([("updated_at", -1)])
                mongo.db.posts.create_index([("comments._id", 1)])

                indexes_created = True
                print("MongoDB indexes created successfully!")
            except Exception as e:
                print(f"Failed to create MongoDB indexes: {e}")

    return app


# 注册扩展
def register_extensions(app):
    """初始化扩展"""
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    cache.init_app(app)
    mongo.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    Compress(app)
    # cors.init_app(app)


# 注册蓝图
def register_blueprints(app):
    app.register_blueprint(api, url_prefix="/api")


# def register_commands(app):
#     # app.cli.add_command(forge)
#     # app.cli.add_command(admin)
#     # app.cli.add_command(init_categories)


def register_errors(app):
    @app.errorhandler(HTTPException)
    def http_error(e):
        return {
            "status": "error",
            "error": e.name,
            "code": e.code,
            "message": e.description,
        }, e.code

    # 自定义 CSRF 错误处理
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        return {"status": "error", "message": f"CSRF 验证失败: {e!s}"}, 400


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify(
        {
            "status": "error",
            "message": "未登录或登录已过期",
            "data": {},
        }
    ), 401
