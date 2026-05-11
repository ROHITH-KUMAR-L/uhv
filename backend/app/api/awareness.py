"""Awareness Hub Router — Educational articles CRUD."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_admin, get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.awareness import ArticleResponse, CreateArticleRequest, UpdateArticleRequest
from app.schemas.common import APIResponse, PaginatedResponse

router = APIRouter(prefix="/awareness", tags=["Awareness Hub"])


@router.get("", response_model=PaginatedResponse[ArticleResponse])
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
):
    """List all articles. Filter by category (phishing, upi, otp, job_fraud, etc.)."""
    db = get_supabase()
    offset = (page - 1) * page_size
    query = db.table("awareness_hub").select("*", count="exact").order("created_at", desc=True)
    if category:
        query = query.eq("category", category)
    result = query.range(offset, offset + page_size - 1).execute()
    return PaginatedResponse(total=result.count or 0, page=page, page_size=page_size,
                             data=[ArticleResponse(**r) for r in result.data])


@router.get("/{article_id}", response_model=APIResponse[ArticleResponse])
async def get_article(article_id: str):
    """Get a single article and increment its view count."""
    db = get_supabase()
    result = db.table("awareness_hub").select("*").eq("id", article_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Article not found.")
    article = result.data[0]
    db.table("awareness_hub").update({"view_count": (article["view_count"] or 0) + 1}).eq("id", article_id).execute()
    return APIResponse(data=ArticleResponse(**article))


@router.post("", response_model=APIResponse[ArticleResponse])
async def create_article(body: CreateArticleRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create a new awareness article."""
    db = get_supabase()
    article_id = str(uuid.uuid4())
    payload = {"id": article_id, **body.model_dump(), "view_count": 0}
    result = db.table("awareness_hub").insert(payload).select("*").execute()
    return APIResponse(message="Article created.", data=ArticleResponse(**result.data[0]))


@router.patch("/{article_id}", response_model=APIResponse[ArticleResponse])
async def update_article(article_id: str, body: UpdateArticleRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update an existing article."""
    db = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    result = db.table("awareness_hub").update(updates).eq("id", article_id).select("*").execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Article not found.")
    return APIResponse(message="Article updated.", data=ArticleResponse(**result.data[0]))


@router.delete("/{article_id}", response_model=APIResponse)
async def delete_article(article_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete an article."""
    db = get_supabase()
    db.table("awareness_hub").delete().eq("id", article_id).execute()
    return APIResponse(message="Article deleted.")
