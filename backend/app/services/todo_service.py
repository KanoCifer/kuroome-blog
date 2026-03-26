import uuid
from datetime import UTC, datetime

from app.repositories.todo_repo import TodoRepo
from app.utils.redis_lock import get_redis_lock


class TodoService:
    """TodoService 负责 Todo 相关的业务逻辑"""

    _LOCK_TTL = 5  # 锁的过期时间，单位秒

    def __init__(self, repo: TodoRepo):
        self.repo = repo

    async def get_todos(self, user_id: int, include_archived: bool = False):
        """获取用户的待办列表"""
        return await self.repo.get_todos(user_id, include_archived)

    async def create_todo(self, user_id: int, todo_data: dict):
        """为用户创建一个新的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todo_id = todo_data.get("id") or uuid.uuid4().hex
                todo = {
                    "id": todo_id,
                    "text": todo_data.get("text"),
                    "completed": bool(todo_data.get("completed")),
                    "createdAt": datetime.now(UTC).isoformat(),
                    "description": todo_data.get("description"),
                    "dueDate": todo_data.get("dueDate"),
                    "priority": todo_data.get("priority") or "medium",
                    "category": todo_data.get("category"),
                    "archived": bool(todo_data.get("archived")),
                    "archivedAt": todo_data.get("archivedAt"),
                }

                await self.repo.create_todo(user_id, todo)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return todo

    async def patch_todo(self, user_id: int, todo_id: str, update_data: dict):
        """更新用户的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                for todo in todos:
                    if todo["id"] == todo_id:
                        # 更新字段
                        for key in [
                            "text",
                            "completed",
                            "description",
                            "dueDate",
                            "priority",
                            "category",
                            "archived",
                        ]:
                            if key in update_data:
                                todo[key] = update_data[key]
                        # 如果 archived 字段被更新，更新 archivedAt 时间
                        if "archived" in update_data:
                            if update_data["archived"]:
                                todo["archivedAt"] = datetime.now(
                                    UTC
                                ).isoformat()
                            else:
                                todo["archivedAt"] = None
                        break
                else:
                    raise Exception("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return todo

    async def replace_todo(self, user_id: int, todo_id: str, new_data: dict):
        """替换用户的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                for idx, todo in enumerate(todos):
                    if todo["id"] == todo_id:
                        # 替换字段
                        new_todo = {
                            "id": todo_id,
                            "text": new_data.get("text"),
                            "completed": bool(new_data.get("completed")),
                            "createdAt": todo["createdAt"],
                            "description": new_data.get("description"),
                            "dueDate": new_data.get("dueDate"),
                            "priority": new_data.get("priority") or "medium",
                            "category": new_data.get("category"),
                            "archived": bool(new_data.get("archived")),
                            "archivedAt": (
                                datetime.now(UTC).isoformat()
                                if new_data.get("archived")
                                else None
                            ),
                        }
                        todos[idx] = new_todo
                        break
                else:
                    raise Exception("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return new_todo

    async def delete_todo(self, user_id: int, todo_id: str):
        """删除用户的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                for idx, todo in enumerate(todos):
                    if todo["id"] == todo_id:
                        deleted = todos.pop(idx)
                        break
                else:
                    raise Exception("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return deleted

    async def get_archived_todos(self, user_id: int):
        """获取用户的已归档待办列表"""
        todos = await self.repo.get_todos(user_id, include_archived=True)
        archived = [t for t in todos if t.get("archived")]
        return archived

    async def archive_todo(self, user_id: int, todo_id: str):
        """归档用户的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                for idx, todo in enumerate(todos):
                    if todo["id"] == todo_id:
                        todo["archived"] = True
                        todo["archivedAt"] = datetime.now(UTC).isoformat()
                        todos[idx] = todo
                        break
                else:
                    raise Exception("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return todo

    async def unarchive_todo(self, user_id: int, todo_id: str):
        """取消归档用户的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                for idx, todo in enumerate(todos):
                    if todo["id"] == todo_id:
                        todo["archived"] = False
                        todo["archivedAt"] = None
                        todos[idx] = todo
                        break
                else:
                    raise Exception("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return todo

    async def archive_completed(self, user_id: int):
        """归档用户所有已完成的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                now = datetime.now(UTC).isoformat()
                count = 0
                for idx, todo in enumerate(todos):
                    if todo.get("completed") and not todo.get("archived"):
                        todo["archived"] = True
                        todo["archivedAt"] = now
                        todos[idx] = todo
                        count += 1

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except Exception as e:
            raise Exception("无法获取锁") from e

        return count

    async def clear_completed(self, user_id: int):
        """清除用户所有已完成的待办"""

        try:
            async with get_redis_lock(
                self.repo.redis,
                key=f"todos:{user_id}",
                ttl=self._LOCK_TTL,
                retries=3,
            ):
                todos = await self.repo.get_todos(
                    user_id, include_archived=True
                )
                remaining = [t for t in todos if not t.get("completed")]
                await self.repo._write_todos(f"todos:{user_id}", remaining)
        except Exception as e:
            raise Exception("无法获取锁") from e
