from pydantic import BaseModel
from typing import Optional


class CreateArticleRequest(BaseModel):
    category: str
    title: str
    summary: str
    content_md: str
    tags: list[str] = []


class UpdateArticleRequest(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    content_md: Optional[str] = None
    tags: Optional[list[str]] = None


class ArticleResponse(BaseModel):
    id: str
    category: str
    title: str
    summary: str
    content_md: str
    tags: list[str]
    view_count: int
    created_at: str
