from fastapi.testclient import TestClient

from app.main import app  # 导入你的 FastAPI 应用实例

client = TestClient(app)  # 创建测试客户端
