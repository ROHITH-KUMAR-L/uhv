"""Reports Router — Crowdsourced scam submission and management."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_admin, get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.reports import CreateReportRequest, ReportResponse, UpdateReportStatusRequest

router = APIRouter(prefix="/reports", tags=["Scam Reports"])


@router.post("", response_model=APIResponse[ReportResponse])
async def submit_report(body: CreateReportRequest, current_user: dict = Depends(get_current_user)):
    """Submit a new crowdsourced scam report. Evidence stored as Base64."""
    db = get_supabase()
    report_id = str(uuid.uuid4())
    payload = {
        "id": report_id,
        "user_id": current_user["sub"],
        "scam_type": body.scam_type.value,
        "platform": body.platform.value,
        "description": body.description,
        "phone_email_used": body.phone_email_used,
        "financial_loss_inr": body.financial_loss_inr,
        "evidence_base64": body.evidence_base64,
        "status": "pending",
        "upvotes": 0,
    }
    result = db.table("scam_reports").insert(payload).select("*").execute()
    return APIResponse(message="Report submitted. Pending review.", data=ReportResponse(**result.data[0]))


@router.get("", response_model=PaginatedResponse[ReportResponse])
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    scam_type: str | None = Query(None),
    status: str | None = Query(None, description="Filter by: pending, verified, rejected"),
):
    """Public feed of scam reports (paginated). Filter by type or status."""
    db = get_supabase()
    offset = (page - 1) * page_size
    query = db.table("scam_reports").select("*", count="exact").order("created_at", desc=True)
    if scam_type:
        query = query.eq("scam_type", scam_type)
    if status:
        query = query.eq("status", status)
    else:
        query = query.eq("status", "verified")   # Default: only show verified
    result = query.range(offset, offset + page_size - 1).execute()
    items = [ReportResponse(**r) for r in result.data]
    return PaginatedResponse(total=result.count or 0, page=page, page_size=page_size, data=items)


@router.get("/mine", response_model=PaginatedResponse[ReportResponse])
async def my_reports(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                     current_user: dict = Depends(get_current_user)):
    """Get the current user's own submitted reports."""
    db = get_supabase()
    offset = (page - 1) * page_size
    result = (db.table("scam_reports").select("*", count="exact")
              .eq("user_id", current_user["sub"]).order("created_at", desc=True)
              .range(offset, offset + page_size - 1).execute())
    return PaginatedResponse(total=result.count or 0, page=page, page_size=page_size,
                             data=[ReportResponse(**r) for r in result.data])


@router.get("/{report_id}", response_model=APIResponse[ReportResponse])
async def get_report(report_id: str):
    """Get a single report by ID."""
    db = get_supabase()
    result = db.table("scam_reports").select("*").eq("id", report_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found.")
    return APIResponse(data=ReportResponse(**result.data[0]))


@router.post("/{report_id}/upvote", response_model=APIResponse)
async def upvote_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """Increment the upvote count on a report."""
    db = get_supabase()
    result = db.table("scam_reports").select("upvotes").eq("id", report_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found.")
    new_count = (result.data[0]["upvotes"] or 0) + 1
    db.table("scam_reports").update({"upvotes": new_count}).eq("id", report_id).execute()
    return APIResponse(message=f"Upvoted. Total: {new_count}")


@router.patch("/{report_id}/status", response_model=APIResponse[ReportResponse])
async def update_report_status(report_id: str, body: UpdateReportStatusRequest,
                                admin: dict = Depends(get_current_admin)):
    """Admin: verify or reject a report."""
    db = get_supabase()
    result = (db.table("scam_reports").update({"status": body.status.value})
              .eq("id", report_id).select("*").execute())
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found.")
    return APIResponse(message=f"Report marked as {body.status.value}.", data=ReportResponse(**result.data[0]))
