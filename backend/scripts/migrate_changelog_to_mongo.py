"""一次性迁移脚本：把 changelog.json 导入 MongoDB changelog 集合

用法（dry-run 默认开启）：
  uv run python scripts/migrate_changelog_to_mongo.py                        # dry-run
  uv run python scripts/migrate_changelog_to_mongo.py --apply                # 实际写入
  uv run python scripts/migrate_changelog_to_mongo.py --file /path/to.json   # 指定 JSON
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo import AsyncMongoClient  # noqa: E402

from app.core.config import settings  # noqa: E402

DB_NAME = "readinglist"
COLLECTION = "changelog"
DEFAULT_JSON = Path(__file__).resolve().parent.parent.parent / "changelog.json"


async def run(apply: bool, json_path: Path) -> None:
    if not settings.MONGO_URI:
        raise RuntimeError("MONGO_URI 未设置")

    # 读取 JSON
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"📄 读取 {json_path.name}：{len(data)} 个版本")

    client = AsyncMongoClient(settings.MONGO_URI)
    db = client[DB_NAME]
    coll = db[COLLECTION]

    # 查已存在的 version，避免重复插入
    existing = await coll.distinct("version")
    existing_set = set(existing)
    print(f"🗄️  MongoDB 已有 {len(existing_set)} 个版本：{sorted(existing_set)}")

    to_insert = []
    skipped = []
    for entry in data:
        ver = entry["version"]
        if ver in existing_set:
            skipped.append(ver)
            continue
        to_insert.append({
            "version": ver,
            "date": entry.get("date", ""),
            "title": entry.get("title", ""),
            "changes": entry.get("changes", []),
        })

    if skipped:
        print(f"⏭️  跳过已存在：{skipped}")

    if not to_insert:
        print("✅ 无需插入，所有版本已存在")
        await client.close()
        return

    print(f"\n将插入 {len(to_insert)} 个新版本：")
    for doc in to_insert:
        print(f"  v{doc['version']} ({doc['date']}) — {doc['title']}  [{len(doc['changes'])} changes]")

    if not apply:
        print("\n(dry-run 模式，未写入)")
        await client.close()
        return

    result = await coll.insert_many(to_insert, ordered=False)
    print(f"\n✅ 已写入 {len(result.inserted_ids)} 条文档到 {COLLECTION}")

    # 验证
    total = await coll.count_documents({})
    print(f"📊 集合当前共 {total} 条文档")
    await client.close()


def main():
    parser = argparse.ArgumentParser(description="迁移 changelog.json 到 MongoDB")
    parser.add_argument("--apply", action="store_true", help="实际执行迁移（默认 dry-run）")
    parser.add_argument("--file", type=Path, default=DEFAULT_JSON, help="changelog.json 路径")
    args = parser.parse_args()

    if not args.file.exists():
        print(f"❌ 文件不存在：{args.file}")
        sys.exit(1)

    asyncio.run(run(apply=args.apply, json_path=args.file))


if __name__ == "__main__":
    main()
