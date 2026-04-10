from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Device(BaseModel):
    id: int
    name: str
    purchase_date: datetime
    price: float
    currency: str
    notes: str | None = None
    status: Literal["active", "retired"]
    reminder_config: dict | None = None


class DeviceInput(BaseModel):
    name: str
    purchase_date: str
    price: float
    currency: str
    notes: str | None = None
    status: Literal["active", "retired"]
    reminder_config: dict | None = None


class DeviceUpdateInput(BaseModel):
    name: str | None = None
    purchase_date: str | None = None
    price: float | None = None
    currency: str | None = None
    notes: str | None = None
    status: Literal["active", "retired"] | None = None
    reminder_config: dict | None = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    purchase_date: datetime
    price: float
    currency: str
    notes: str | None = None
    status: Literal["active", "retired"]
    reminder_config: dict | None = None
