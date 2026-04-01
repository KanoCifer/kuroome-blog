import uuid
from datetime import UTC, datetime

from app.core.exceptions import TodoLockError
from app.repositories.todo_repo import TodoRepo
from app.utils.redis_lock import get_redis_lock


class TodoService:
    """Todo service layer combining repository access with business rules."""

    _LOCK_TTL = 5

    def __init__(self, repo: TodoRepo):
        self.repo = repo

    # ------------------------------------------------------------------
    # Read operations (no lock needed)
    # ------------------------------------------------------------------

    async def get_todos(self, user_id: int, include_archived: bool = False):
        return await self.repo.get_todos(user_id, include_archived)

    # ------------------------------------------------------------------
    # Write operations (all require lock)
    # ------------------------------------------------------------------

    async def create_todo(self, user_id: int, todo_data: dict):
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
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return todo

    async def patch_todo(self, user_id: int, todo_id: str, update_data: dict):
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
                        if "archived" in update_data:
                            todo["archivedAt"] = (
                                datetime.now(UTC).isoformat()
                                if update_data["archived"]
                                else None
                            )
                        break
                else:
                    raise TodoLockError("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return todo

    async def replace_todo(self, user_id: int, todo_id: str, new_data: dict):
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
                    raise TodoLockError("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return new_todo

    async def delete_todo(self, user_id: int, todo_id: str):
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
                    raise TodoLockError("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return deleted

    async def archive_todo(self, user_id: int, todo_id: str):
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
                    raise TodoLockError("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return todo

    async def unarchive_todo(self, user_id: int, todo_id: str):
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
                    raise TodoLockError("待办不存在")

                await self.repo._write_todos(f"todos:{user_id}", todos)
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return todo

    async def archive_completed(self, user_id: int):
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
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e

        return count

    async def clear_completed(self, user_id: int):
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
        except TodoLockError:
            raise
        except Exception as e:
            raise TodoLockError from e
