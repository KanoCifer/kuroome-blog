"""一次性迁移脚本：把 weread_books 集合的 _id 从 ObjectId 改成 bookId 字符串

背景：
  原 WereadBook 模型用 Field(alias="bookId") 把 bookId 字段映射到 _id 之外
  的另一字段；Mongo 里实际存的 _id 是 ObjectId，bookId 才是真正的业务主键。
  新模型让 _id 直接 = bookId，让 Beanie Link 的 $lookup 能正常工作。

操作：
  1. 把当前 weread_books 重命名为 weread_books_legacy（备份）
  2. 读 legacy 数据，按 bookId 作为新 _id 写入 weread_books
  3. 验证数量一致、抽样核对
  4. 备份集合保留，手动确认后人工 drop

用法（dry-run 默认开启）：
  uv run python scripts/migrate_weread_books_id.py            # dry-run，只读
  uv run python scripts/migrate_weread_books_id.py --apply    # 实际执行
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
LEGACY = "weread_books_legacy"
TARGET = "weread_books"


async def fetch_all(coll) -> list[dict]:
    return await coll.find({}).to_list(length=None)


async def run(apply: bool) -> None:
    if not settings.MONGO_URI:
        raise RuntimeError("MONGO_URI 未设置")
    client = AsyncMongoClient(settings.MONGO_URI)
    db = client[DB_NAME]

    legacy_coll = db[LEGACY]
    target_coll = db[TARGET]

    legacy_exists = await legacy_coll.estimated_document_count() > 0
    if legacy_exists and apply:
        print(f"⚠️  备份集合 {LEGACY} 已存在，先检查")
        legacy_count = await legacy_coll.count_documents({})
        target_count = await target_coll.count_documents({})
        if target_count > 0:
            print(
                f"❌ {TARGET} 已有 {target_count} 条数据；为防误覆盖，拒绝执行。"
                " 请先人工确认/清空。"
            )
            await client.close()
            return
    elif not apply:
        print("(dry-run 模式，不会写入)")

    current = await fetch_all(target_coll)
    if not current:
        print(f"❌ {TARGET} 集合为空，请先确认库名是否正确（{DB_NAME}）")
        return

    print(f"读取 {len(current)} 条原数据")
    sample = current[0]
    print(f"  样本: _id={sample.get('_id')!r} bookId={sample.get('bookId')!r}")

    bad = [d for d in current if not d.get("bookId")]
    if bad:
        print(f"❌ {len(bad)} 条文档缺 bookId，无法迁移：{bad[:3]}")
        return

    # 1) 备份
    if apply:
        if not legacy_exists:
            # renameCollection 命令必须跑在 admin 库
            admin = client["admin"]
            await admin.command(
                "renameCollection",
                f"{DB_NAME}.{TARGET}",
                to=f"{DB_NAME}.{LEGACY}",
            )
            print(f"✅ 已把 {TARGET} 重命名为 {LEGACY}（备份）")
            current = await fetch_all(legacy_coll)
        else:
            # 备份已存在：把当前 target 内容作为迁移源
            current = await fetch_all(legacy_coll)
            print(f"ℹ️  复用已有 {LEGACY}（{len(current)} 条）")

    # 2) 重建
    if apply:
        new_docs = []
        seen_ids: set[str] = set()
        for d in current:
            bid = d["bookId"]
            if bid in seen_ids:
                continue
            seen_ids.add(bid)
            d["_id"] = bid
            d.pop("bookId", None)
            new_docs.append(d)
        await target_coll.insert_many(new_docs, ordered=False)
        print(f"✅ 已写入 {len(new_docs)} 条新文档到 {TARGET}")
    else:
        print(f"将把 {len(current)} 条文档的 _id 替换为 bookId 字符串")

    # 3) 验证
    if apply:
        new_count = await target_coll.count_documents({})
        legacy_count = await legacy_coll.count_documents({})
        print(f"  legacy={legacy_count}  new={new_count}  match={new_count == legacy_count}")

        # 抽样：找一个 UserBook，看 bookInfo 的 DBRef 引用能不能解析到新 _id
        ub = await db.weread_user_books.find_one({"bookInfo": {"$exists": True}})
        if ub:
            ref = ub["bookInfo"]
            # bson DBRef 对象：collection / id 属性
            coll = getattr(ref, "collection", None) or ref.get("$ref")
            oid = getattr(ref, "id", None) or ref.get("$id")
            print(f"  样本 UserBook.bookInfo: ref={coll!r} id={oid!r}")
            target = await target_coll.find_one({"_id": oid})
            if target:
                print(f"  ✅ DBRef 解析到新 _id 成功：title={target.get('title')!r}")
            else:
                print(f"  ❌ DBRef 解析失败，{TARGET} 找不到 _id={oid!r}")

    await client.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="实际执行迁移（默认 dry-run）",
    )
    args = parser.parse_args()
    asyncio.run(run(apply=args.apply))


if __name__ == "__main__":
    main()
