from pathlib import Path

from dotenv import load_dotenv

dotenv_path = Path(__file__).resolve().parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

from watchlist import create_app  # noqa
from werkzeug.middleware.proxy_fix import ProxyFix  # noqa

app = create_app()
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
