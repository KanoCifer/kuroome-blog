from beanie import WriteRules
from beanie.odm.queries.find import FindOne
from pymongo.errors import DuplicateKeyError


async def upsert(
    doc,
    find_one: FindOne,
    *,
    link_rule: WriteRules | None = None,
):
    """通用 find-or-upsert：按 find_one 查询，存在则更新 .id 并保存，不存在则插入。

    Args:
        doc: 待保存的 Document 实例
        find_one: Beanie 的 find_one 查询对象（如 WereadBook.find_one({...})）
        link_rule: 可选的 WriteRules，用于级联写入关联文档
    """
    existing = await find_one
    if existing:
        doc.id = existing.id
        if link_rule is not None:
            await doc.save(link_rule=link_rule)
        else:
            await doc.save()
        return doc
    try:
        await doc.insert()
    except DuplicateKeyError:
        # 极端竞态：insert 期间另一请求已写入，回退为更新
        existing = await find_one
        if existing:
            doc.id = existing.id
            if link_rule is not None:
                await doc.save(link_rule=link_rule)
            else:
                await doc.save()
    return doc
