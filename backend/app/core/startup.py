"""Server startup metadata.

Importable without circular dependencies — no app.api.* or app.main imports.
"""

from __future__ import annotations

import time

SERVER_START_TIME: float = time.time()
