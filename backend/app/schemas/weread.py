from pydantic import BaseModel


class ImportBooksIn(BaseModel):
    """Import books from WeRead input schema."""

    weread_cookie: str
