from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

broker = RedisStreamBroker(
    "redis://localhost:6379/3",
    with_result_backend=RedisAsyncResultBackend("redis://localhost:6379/4"),
)
