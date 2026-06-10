"""将 changelog JSON 文件插入/更新到 MongoDB changelog 集合

用法：
  uv run python scripts/insert_changelog.py                          # 从默认路径读取
  uv run python scripts/insert_changelog.py --file changelog_data.json  # 指定文件
  uv run python scripts/insert_changelog.py --dry-run               # 预览不写入
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import AsyncMongoClient, UpdateOne  # noqa: E402

from app.core.config import settings  # noqa: E402

DB_NAME = "readinglist"
COLLECTION = "changelog"
DEFAULT_FILE = Path(__file__).resolve().parent.parent / "changelog_data.json"


async def run(dry_run: bool, json_path: Path) -> None:
    if not settings.MONGO_URI:
        raise RuntimeError("MONGO_URI 未设置")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = data if isinstance(data, list) else [data]
    print(f"📄 读取 {json_path.name}：{len(entries)} 个版本")

    client = AsyncMongoClient(settings.MONGO_URI)
    db = client[DB_NAME]
    coll = db[COLLECTION]

    existing_versions = set(await coll.distinct("version"))
    print(f"🗄️  MongoDB 已有 {len(existing_versions)} 个版本")

    operations = []
    for entry in entries:
        doc = {
            "version": entry["version"],
            "date": entry.get("date", ""),
            "title": entry.get("title", ""),
            "changes": entry.get("changes", []),
        }
        operations.append(
            UpdateOne({"version": doc["version"]}, {"$set": doc}, upsert=True)
        )

    inserts = sum(1 for e in entries if e["version"] not in existing_versions)
    updates = len(entries) - inserts

    print(f"\n将执行 {len(operations)} 条操作：{inserts} 新增，{updates} 更新")
    for e in entries:
        status = "🆕" if e["version"] not in existing_versions else "🔄"
        print(f"  {status} v{e['version']} ({e.get('date', '')}) — {e.get('title', '')}")

    if dry_run:
        print("\n(dry-run 模式，未写入)")
        await client.close()
        return

    result = await coll.bulk_write(operations, ordered=False)
    print(f"\n✅ 完成：新增 {result.upserted_count}，更新 {result.modified_count}")

    total = await coll.count_documents({})
    print(f"📊 集合当前共 {total} 条文档")
    await client.close()


def main():
    parser = argparse.ArgumentParser(description="插入/更新 changelog 到 MongoDB")
    parser.add_argument("--dry-run", action="store_true", help="预览变更，不写入")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="changelog JSON 文件路径")
    args = parser.parse_args()

    if not args.file.exists():
        print(f"❌ 文件不存在：{args.file}", file=sys.stderr)
        sys.exit(1)

    asyncio.run(run(dry_run=args.dry_run, json_path=args.file))


if __name__ == "__main__":
    main()
