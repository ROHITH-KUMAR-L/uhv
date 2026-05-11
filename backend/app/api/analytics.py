"""Analytics Router — real-time scam trend data for the dashboard."""
from fastapi import APIRouter, Depends
from app.core.supabase_client import get_supabase
from app.schemas.common import APIResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=APIResponse)
async def overview():
    """Total reports, total detections, risk level summary."""
    db = get_supabase()
    total_reports = db.table("scam_reports").select("id", count="exact").execute().count or 0
    total_detections = db.table("detection_logs").select("id", count="exact").execute().count or 0
    critical = db.table("detection_logs").select("id", count="exact").eq("risk_level", "critical").execute().count or 0
    high = db.table("detection_logs").select("id", count="exact").eq("risk_level", "high").execute().count or 0
    safe = db.table("detection_logs").select("id", count="exact").eq("risk_level", "safe").execute().count or 0

    return APIResponse(data={
        "total_reports": total_reports,
        "total_detections": total_detections,
        "risk_summary": {"critical": critical, "high": high, "safe": safe},
    })


@router.get("/by-category", response_model=APIResponse)
async def by_category():
    """Count of verified reports grouped by scam type."""
    db = get_supabase()
    result = (db.table("scam_reports").select("scam_type")
              .eq("status", "verified").execute())
    counts: dict = {}
    for row in result.data:
        t = row["scam_type"]
        counts[t] = counts.get(t, 0) + 1
    return APIResponse(data={"categories": counts})


@router.get("/by-risk", response_model=APIResponse)
async def by_risk():
    """Distribution of detection logs by risk level."""
    db = get_supabase()
    levels = ["safe", "low", "medium", "high", "critical"]
    distribution = {}
    for level in levels:
        count = db.table("detection_logs").select("id", count="exact").eq("risk_level", level).execute().count or 0
        distribution[level] = count
    return APIResponse(data={"risk_distribution": distribution})


@router.get("/top-scams", response_model=APIResponse)
async def top_scams():
    """Top 5 most reported scam types this month."""
    db = get_supabase()
    result = db.table("scam_reports").select("scam_type").eq("status", "verified").execute()
    counts: dict = {}
    for row in result.data:
        t = row["scam_type"]
        counts[t] = counts.get(t, 0) + 1
    top5 = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return APIResponse(data={"top_scams": [{"type": k, "count": v} for k, v in top5]})


@router.get("/trends", response_model=APIResponse)
async def trends():
    """Report count grouped by date (last 30 days)."""
    db = get_supabase()
    result = db.table("scam_reports").select("created_at").execute()
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    daily: dict = {}
    for row in result.data:
        dt = datetime.fromisoformat(row["created_at"])
        if dt >= cutoff:
            day = dt.strftime("%Y-%m-%d")
            daily[day] = daily.get(day, 0) + 1
    sorted_days = sorted(daily.items())
    return APIResponse(data={"trend": [{"date": d, "count": c} for d, c in sorted_days]})
