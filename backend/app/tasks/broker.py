from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker

result_backend = RedisAsyncResultBackend(
    redis_url="redis://localhost:6379/3",
)

broker = RedisStreamBroker(
    url="redis://localhost:6379/3",
).with_result_backend(result_backend)
