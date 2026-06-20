from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class LogResponse(BaseModel):
    """单条日志的对外视图。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    level: str
    message: str
    extra: dict[str, Any]
