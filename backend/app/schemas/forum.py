from pydantic import BaseModel
from typing import Optional


class CreatePostRequest(BaseModel):
    title: str
    body: str
    is_scam_query: bool = True
    evidence_base64: Optional[str] = None


class CreateReplyRequest(BaseModel):
    body: str


class ForumReply(BaseModel):
    id: str
    post_id: str
    user_id: str
    body: str
    is_expert_reply: bool
    upvotes: int
    created_at: str


class ForumPost(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    is_scam_query: bool
    evidence_base64: Optional[str]
    upvotes: int
    is_resolved: bool
    created_at: str
    replies: list[ForumReply] = []


class ForumPostSummary(BaseModel):
    id: str
    user_id: str
    title: str
    is_scam_query: bool
    upvotes: int
    is_resolved: bool
    reply_count: int
    created_at: str
