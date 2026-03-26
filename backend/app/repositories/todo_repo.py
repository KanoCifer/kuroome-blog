import orjson
from redis.asyncio import Redis as AsyncRedis


class TodoRepo:
    """TodoRepo 负责 Todo 数据的增删改查"""

    def __init__(self, redis: AsyncRedis):
        self.redis = redis

    async def _write_todos(self, key: str, todos: list[dict]) -> None:
        await self.redis.set(key, orjson.dumps(todos).decode())

    async def _read_todos(self, key: str) -> list[dict]:
        val = await self.redis.get(key)
        if not val:
            return []
        try:
            return orjson.loads(val)
        except Exception:
            return []

    async def get_todos(self, user_id: int, include_archived: bool = False):
        """获取用户的待办列表"""
        key = f"todos:{user_id}"
        todos = await self._read_todos(key)
        if not include_archived:
            todos = [t for t in todos if not t.get("archived")]
        return todos

    async def create_todo(self, user_id: int, todo_data: dict):
        """为用户创建一个新的待办"""
        key = f"todos:{user_id}"
        todos = await self._read_todos(key)
        todos.append(todo_data)
        await self._write_todos(key, todos)
