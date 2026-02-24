from apiflask import APIBlueprint

api = APIBlueprint("api", __name__)

from watchlist.api import auth  # noqa
from watchlist.api import views  # noqa
from watchlist.api import blog  # noqa
from watchlist.api import weread  # noqa
