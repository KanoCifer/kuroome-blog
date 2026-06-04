from __future__ import annotations

import orjson


def sse_event(data: dict) -> str:
    return f"data:{orjson.dumps(data).decode()}\n\n"
