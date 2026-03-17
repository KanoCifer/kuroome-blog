from datetime import UTC, datetime

from pydantic import BaseModel


class VisitorData(BaseModel):
    """追踪信息Schema"""

    visitor_id: str
    page_url: str
    page_path: str
    referrer: str = ""
    browser: str = ""
    screen_resolution: str = ""
    language: str = ""
    browser_name: str = ""
    browser_version: str = ""
    os_name: str = ""
    os_version: str = ""
    device_type: str = ""
    cpu: str = ""
    ip_address: str | None = None
    visit_time: datetime = datetime.now(UTC)
