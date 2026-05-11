"""
Detection Router — Core ScamShield AI Engine.
POST /detect/analyze  — Master: text + URL + image
POST /detect/url      — URL-only VirusTotal scan
POST /detect/file     — File upload scan (<=60MB)
GET  /detect/history  — User's past scan results
GET  /detect/history/{id} — Single result detail
"""
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.core.security import get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.detect import (
    AnalyzeRequest,
    DetectionHistoryItem,
    DetectionResult,
    URLScanRequest,
    VirusTotalFileResult,
    VirusTotalURLResult,
)
from app.services import gemini_service, virustotal_service
from app.services.file_service import cleanup_temp_file, save_temp_file

router = APIRouter(prefix="/detect", tags=["Detection Engine"])

_URL_PATTERN = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+', re.IGNORECASE)


def _compute_risk_score(gemini_result, vt_url, vt_file) -> int:
    score = 0
    verdict_weight = {"SCAM": 1.0, "SUSPICIOUS": 0.6, "UNKNOWN": 0.3, "SAFE": 0.0}
    weight = verdict_weight.get(gemini_result.verdict, 0.0)
    score += int(weight * gemini_result.confidence * 60)
    if vt_url and vt_url.total_engines > 0:
        score += int((vt_url.malicious / vt_url.total_engines) * 35)
        score += int((vt_url.suspicious / vt_url.total_engines) * 5)
    if vt_file and vt_file.total_engines > 0:
        score += int((vt_file.malicious / vt_file.total_engines) * 40)
    return min(score, 100)


def _risk_level(score: int) -> str:
    if score <= 15:
        return "safe"
    elif score <= 35:
        return "low"
    elif score <= 60:
        return "medium"
    elif score <= 80:
        return "high"
    return "critical"


async def _save_log(db, user_id, input_type, raw_input, file_name, file_hash, result, gemini_raw, vt_raw) -> str:
    log_id = str(uuid.uuid4())
    db.table("detection_logs").insert({
        "id": log_id, "user_id": user_id, "input_type": input_type,
        "raw_input": raw_input, "file_name": file_name, "file_hash": file_hash,
        "risk_score": result.risk_score, "risk_level": result.risk_level,
        "gemini_summary": result.summary, "gemini_raw": gemini_raw,
        "virustotal_raw": vt_raw, "suspicious_phrases": result.suspicious_phrases,
        "recommended_actions": result.recommended_actions,
    }).execute()
    return log_id


@router.post("/analyze", response_model=APIResponse[DetectionResult])
async def analyze(body: AnalyzeRequest, current_user: dict | None = Depends(get_current_user)):
    """Master analysis: Gemini (text/image) + VirusTotal (URLs in text)."""
    if not body.has_content():
        raise HTTPException(status_code=400, detail="Provide at least one of: text, url, or image_base64.")

    db = get_supabase()
    parts = [k for k, v in {"text": body.text, "url": body.url, "image": body.image_base64}.items() if v]
    input_type = "+".join(parts) if len(parts) > 1 else parts[0]

    gemini = await gemini_service.analyze_combined(body.text, body.image_base64)

    vt_url_result = None
    url_to_scan = body.url or (_URL_PATTERN.findall(body.text or "")[0:1] or [None])[0]
    if url_to_scan:
        try:
            vt_url_result = await virustotal_service.scan_url(url_to_scan)
        except Exception:
            pass

    score = _compute_risk_score(gemini, vt_url_result, None)
    result = DetectionResult(
        detection_id="", input_type=input_type, risk_score=score,
        risk_level=_risk_level(score), summary=gemini.summary,
        suspicious_phrases=gemini.suspicious_phrases,
        recommended_actions=gemini.recommended_actions,
        gemini=gemini, virustotal_url=vt_url_result,
    )
    uid = current_user.get("sub") if current_user else None
    result.detection_id = await _save_log(db, uid, input_type, body.text or body.url,
                                          None, None, result, gemini.model_dump(),
                                          vt_url_result.model_dump() if vt_url_result else None)
    return APIResponse(data=result)


@router.post("/url", response_model=APIResponse[DetectionResult])
async def scan_url_endpoint(body: URLScanRequest, current_user: dict | None = Depends(get_current_user)):
    """Quick URL reputation check via VirusTotal + Gemini context."""
    db = get_supabase()
    vt = await virustotal_service.scan_url(body.url)
    gemini = await gemini_service.analyze_text(f"Security analysis for URL: {body.url}")
    score = _compute_risk_score(gemini, vt, None)
    result = DetectionResult(
        detection_id="", input_type="url", risk_score=score,
        risk_level=_risk_level(score), summary=gemini.summary,
        suspicious_phrases=gemini.suspicious_phrases,
        recommended_actions=gemini.recommended_actions,
        gemini=gemini, virustotal_url=vt,
    )
    uid = current_user.get("sub") if current_user else None
    result.detection_id = await _save_log(db, uid, "url", body.url, None, None, result,
                                          gemini.model_dump(), vt.model_dump())
    return APIResponse(data=result)


@router.post("/file", response_model=APIResponse[DetectionResult])
async def scan_file_endpoint(file: UploadFile = File(...), current_user: dict | None = Depends(get_current_user)):
    """
    VirusTotal-style file scanner (<=60MB).
    Temp save -> hash -> VT scan -> delete. Nothing stored in Supabase.
    """
    db = get_supabase()
    temp_path: Path = await save_temp_file(file)
    file_name = file.filename or "unknown"

    try:
        vt = await virustotal_service.scan_file(temp_path, file_name)
    except Exception as e:
        cleanup_temp_file(temp_path)
        raise HTTPException(status_code=502, detail=f"VirusTotal scan failed: {e}")

    gemini = await gemini_service.analyze_text(
        f"File '{file_name}' scanned. VT: {vt.malicious} malicious, "
        f"{vt.suspicious} suspicious of {vt.total_engines} engines. Provide assessment."
    )
    score = _compute_risk_score(gemini, None, vt)
    result = DetectionResult(
        detection_id="", input_type="file", risk_score=score,
        risk_level=_risk_level(score), summary=gemini.summary,
        suspicious_phrases=gemini.suspicious_phrases,
        recommended_actions=gemini.recommended_actions,
        gemini=gemini, virustotal_file=vt,
    )
    uid = current_user.get("sub") if current_user else None
    result.detection_id = await _save_log(db, uid, "file", None, file_name,
                                          vt.sha256, result, gemini.model_dump(), vt.model_dump())
    return APIResponse(data=result)


@router.get("/history", response_model=PaginatedResponse[DetectionHistoryItem])
async def get_history(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                      current_user: dict = Depends(get_current_user)):
    """Return the current user's detection history (paginated)."""
    db = get_supabase()
    offset = (page - 1) * page_size
    result = (
        db.table("detection_logs")
        .select("id, input_type, risk_score, risk_level, gemini_summary, created_at", count="exact")
        .eq("user_id", current_user["sub"])
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    items = [DetectionHistoryItem(id=r["id"], input_type=r["input_type"],
                                  risk_score=r["risk_score"], risk_level=r["risk_level"],
                                  summary=r["gemini_summary"] or "", created_at=r["created_at"])
             for r in result.data]
    return PaginatedResponse(total=result.count or 0, page=page, page_size=page_size, data=items)


@router.get("/history/{detection_id}", response_model=APIResponse[DetectionResult])
async def get_detection_detail(detection_id: str, current_user: dict = Depends(get_current_user)):
    """Full detail for a single detection log entry."""
    db = get_supabase()
    result = (db.table("detection_logs").select("*")
              .eq("id", detection_id).eq("user_id", current_user["sub"]).execute())
    if not result.data:
        raise HTTPException(status_code=404, detail="Detection record not found.")
    r = result.data[0]
    is_file = r["input_type"] == "file"
    detail = DetectionResult(
        detection_id=r["id"], input_type=r["input_type"],
        risk_score=r["risk_score"], risk_level=r["risk_level"],
        summary=r["gemini_summary"] or "",
        suspicious_phrases=r.get("suspicious_phrases") or [],
        recommended_actions=r.get("recommended_actions") or [],
        virustotal_url=VirusTotalURLResult(**r["virustotal_raw"]) if r.get("virustotal_raw") and not is_file else None,
        virustotal_file=VirusTotalFileResult(**r["virustotal_raw"]) if r.get("virustotal_raw") and is_file else None,
    )
    return APIResponse(data=detail)
