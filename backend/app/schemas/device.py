from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReminderConfig(BaseModel):
    """设备提醒配置"""

    enabled: bool = Field(default=True, description="是否启用提醒")
    milestones: list[int] = Field(
        default_factory=lambda: [100, 365, 730, 1000, 1825],
        description="里程碑天数列表，如 [100, 365, 730] 表示100天、1年、2年时提醒",
    )
    channels: list[str] = Field(
        default_factory=lambda: ["email"],
        description="通知渠道列表",
    )
    # 渠道配置（可选）
    feishu_webhook_url: str | None = None
    email: str | None = None
    bark_device_key: str | None = None


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
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    purchase_date: datetime
    price: float
    currency: str
    notes: str | None = None
    status: Literal["active", "retired"]
    reminder_config: dict | None = None


class DeviceStatusUpdate(BaseModel):
    """设备状态更新"""

    status: Literal["active", "retired"]


class ReminderConfigUpdate(BaseModel):
    """提醒配置更新"""

    reminder_config: dict
