from app.tasks.broker import broker


@broker.task
async def test() -> None:
    print("nothing")
