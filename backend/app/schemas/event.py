from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class EventResponse(BaseModel):
    """单条事件的对外视图。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    type: str
    source: str
    title: str
    message: str
    extra: dict[str, Any]
