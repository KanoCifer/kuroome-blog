from fastapi import APIRouter

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/summary")
async def summary_article(content: str):
    pass
