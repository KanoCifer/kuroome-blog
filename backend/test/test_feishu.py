import asyncio

from app.tasks.task import send_feishu_message


def test_send_feishu_message():
    """调用异步发送函数并在事件循环里运行确保不抛出异常。

    若希望避免真实网络调用可使用 monkeypatch 或在环境中设置测试标志。
    """
    asyncio.run(send_feishu_message("测试飞书消息发送（pytest）"))
