from flask import Blueprint

admin_bp = Blueprint("admin", __name__)

from watchlist.admin import views  # noqa
