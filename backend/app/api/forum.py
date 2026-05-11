"""Forum Router — Community scam discussion and verification posts."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.forum import CreatePostRequest, CreateReplyRequest, ForumPost, ForumPostSummary, ForumReply

router = APIRouter(prefix="/forum", tags=["Community Forum"])


@router.get("/posts", response_model=PaginatedResponse[ForumPostSummary])
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_scam_query: bool | None = Query(None),
    is_resolved: bool | None = Query(None),
):
    """Paginated list of all forum posts. Optionally filter by type or resolved status."""
    db = get_supabase()
    offset = (page - 1) * page_size
    query = db.table("forum_posts").select("*", count="exact").order("created_at", desc=True)
    if is_scam_query is not None:
        query = query.eq("is_scam_query", is_scam_query)
    if is_resolved is not None:
        query = query.eq("is_resolved", is_resolved)
    result = query.range(offset, offset + page_size - 1).execute()

    summaries = []
    for r in result.data:
        reply_count = db.table("forum_replies").select("id", count="exact").eq("post_id", r["id"]).execute().count or 0
        summaries.append(ForumPostSummary(
            id=r["id"], user_id=r["user_id"], title=r["title"],
            is_scam_query=r["is_scam_query"], upvotes=r["upvotes"],
            is_resolved=r["is_resolved"], reply_count=reply_count, created_at=r["created_at"],
        ))
    return PaginatedResponse(total=result.count or 0, page=page, page_size=page_size, data=summaries)


@router.post("/posts", response_model=APIResponse[ForumPost])
async def create_post(body: CreatePostRequest, current_user: dict = Depends(get_current_user)):
    """Create a new forum post. Can include a Base64 evidence screenshot."""
    db = get_supabase()
    post_id = str(uuid.uuid4())
    payload = {
        "id": post_id, "user_id": current_user["sub"], "title": body.title,
        "body": body.body, "is_scam_query": body.is_scam_query,
        "evidence_base64": body.evidence_base64, "upvotes": 0, "is_resolved": False,
    }
    result = db.table("forum_posts").insert(payload).select("*").execute()
    return APIResponse(message="Post created.", data=ForumPost(**result.data[0]))


@router.get("/posts/{post_id}", response_model=APIResponse[ForumPost])
async def get_post(post_id: str):
    """Get a single post with all its replies."""
    db = get_supabase()
    post_result = db.table("forum_posts").select("*").eq("id", post_id).execute()
    if not post_result.data:
        raise HTTPException(status_code=404, detail="Post not found.")
    post = post_result.data[0]

    replies_result = (db.table("forum_replies").select("*")
                      .eq("post_id", post_id).order("created_at").execute())
    replies = [ForumReply(**r) for r in replies_result.data]
    return APIResponse(data=ForumPost(**post, replies=replies))


@router.post("/posts/{post_id}/reply", response_model=APIResponse[ForumReply])
async def add_reply(post_id: str, body: CreateReplyRequest, current_user: dict = Depends(get_current_user)):
    """Add a reply to a forum post."""
    db = get_supabase()
    post_check = db.table("forum_posts").select("id").eq("id", post_id).execute()
    if not post_check.data:
        raise HTTPException(status_code=404, detail="Post not found.")

    # Check if user is admin (expert reply)
    profile = db.table("profiles").select("role").eq("id", current_user["sub"]).execute()
    is_expert = profile.data[0]["role"] == "admin" if profile.data else False

    reply_id = str(uuid.uuid4())
    payload = {
        "id": reply_id, "post_id": post_id, "user_id": current_user["sub"],
        "body": body.body, "is_expert_reply": is_expert, "upvotes": 0,
    }
    result = db.table("forum_replies").insert(payload).select("*").execute()
    return APIResponse(message="Reply added.", data=ForumReply(**result.data[0]))


@router.post("/posts/{post_id}/upvote", response_model=APIResponse)
async def upvote_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Upvote a forum post."""
    db = get_supabase()
    result = db.table("forum_posts").select("upvotes").eq("id", post_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found.")
    new_count = (result.data[0]["upvotes"] or 0) + 1
    db.table("forum_posts").update({"upvotes": new_count}).eq("id", post_id).execute()
    return APIResponse(message=f"Upvoted. Total: {new_count}")


@router.patch("/posts/{post_id}/resolve", response_model=APIResponse)
async def resolve_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a post as resolved. Only the post owner or an admin can resolve."""
    db = get_supabase()
    post_result = db.table("forum_posts").select("user_id").eq("id", post_id).execute()
    if not post_result.data:
        raise HTTPException(status_code=404, detail="Post not found.")
    post = post_result.data[0]
    profile = db.table("profiles").select("role").eq("id", current_user["sub"]).execute()
    role = profile.data[0]["role"] if profile.data else "user"
    if post["user_id"] != current_user["sub"] and role != "admin":
        raise HTTPException(status_code=403, detail="Only the post owner or admin can resolve.")
    db.table("forum_posts").update({"is_resolved": True}).eq("id", post_id).execute()
    return APIResponse(message="Post marked as resolved.")


@router.delete("/posts/{post_id}", response_model=APIResponse)
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a post. Owner or admin only."""
    db = get_supabase()
    post_result = db.table("forum_posts").select("user_id").eq("id", post_id).execute()
    if not post_result.data:
        raise HTTPException(status_code=404, detail="Post not found.")
    post = post_result.data[0]
    profile = db.table("profiles").select("role").eq("id", current_user["sub"]).execute()
    role = profile.data[0]["role"] if profile.data else "user"
    if post["user_id"] != current_user["sub"] and role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
    db.table("forum_replies").delete().eq("post_id", post_id).execute()
    db.table("forum_posts").delete().eq("id", post_id).execute()
    return APIResponse(message="Post and replies deleted.")
