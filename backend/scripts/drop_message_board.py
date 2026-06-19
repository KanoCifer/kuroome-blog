"""一次性脚本：drop 留言板 MongoDB 集合 message_board

背景：
  留言功能已废弃，前端 /views/messages、MessageBoard 公开组件、messageGateway、
  后端 MessageBoard 模型 / MessageService / MessageRepo / admin message 方法 /
  /api/v1/messages 与 /api/v1/admin/messages* 端点已全部清理。
  MongoDB 里的 message_board 集合仍残留历史数据，本脚本负责 drop 它（不可恢复）。

警告：
  - 此操作不可逆。脚本默认 dry-run，需显式 --apply 才执行 drop。
  - 建议先在备份或 staging 环境跑一次，确认无依赖后生产再跑。

用法（dry-run 默认开启）：
  cd backend && uv run python scripts/drop_message_board.py            # dry-run
  cd backend && uv run python scripts/drop_message_board.py --apply    # 实际 drop
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# 让脚本能从 backend/ 根目录直接 import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import AsyncMongoClient  # noqa: E402

from app.core.config import settings  # noqa: E402

DB_NAME = "readinglist"
TARGET = "message_board"


async def main(apply: bool) -> None:
    client = AsyncMongoClient(settings.MONGO_URI)
    db = client[DB_NAME]

    try:
        existing = await db.list_collection_names()
        if TARGET not in existing:
            print(f"✅ 集合 {TARGET!r} 不存在，无需处理")
            return

        count = await db[TARGET].count_documents({})
        print(f"🔍 发现集合 {TARGET!r}，当前文档数: {count}")

        if not apply:
            print("⚠️  dry-run 模式 — 未执行 drop")
            print(f"   确认要删除请加 --apply: uv run python scripts/{Path(__file__).name} --apply")
            return

        await db.drop_collection(TARGET)
        print(f"✅ 已 drop 集合 {TARGET!r}（{count} 条文档）")
    finally:
        await client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Drop message_board collection")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="实际执行 drop（默认 dry-run）",
    )
    args = parser.parse_args()
    asyncio.run(main(apply=args.apply))
