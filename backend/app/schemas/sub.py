from pydantic import BaseModel, ConfigDict, Field


class CreateOneSubRequest(BaseModel):
    """订阅创建请求体"""

    name: str = Field(..., description="订阅名称")
    provider: str = Field(..., description="订阅链接")
    price: float = Field(..., description="价格")
    currency: str = Field(..., description="货币")
    billing_cycle: str = Field(..., description="账单周期")
    next_billing_date: str = Field(..., description="下次账单日期")
    reminder_config: dict | None = Field(None, description="提醒配置")
    status: str = Field(..., description="订阅状态")
    notes: str | None = Field(None, description="备注")


class UpdateSubRequest(BaseModel):
    """订阅更新请求体"""

    name: str | None = Field(None, description="订阅名称")
    provider: str | None = Field(None, description="订阅链接")
    price: float | None = Field(None, description="价格")
    currency: str | None = Field(None, description="货币")
    billing_cycle: str | None = Field(None, description="账单周期")
    next_billing_date: str | None = Field(None, description="下次账单日期")
    reminder_config: dict | None = Field(None, description="提醒配置")
    status: str | None = Field(None, description="订阅状态")
    notes: str | None = Field(None, description="备注")


class SubResponse(BaseModel):
    """订阅响应体"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    provider: str
    price: float
    currency: str
    billing_cycle: str
    next_billing_date: str
    reminder_config: dict | None
    status: str
    notes: str | None
    created_at: str
    updated_at: str


class TestNotificationRequest(BaseModel):
    """测试通知请求体"""

    channels: list[str] = Field(
        ..., description="通知渠道列表，如 ['bark', 'email']"
    )
    config: dict = Field(default_factory=dict, description="渠道配置")
