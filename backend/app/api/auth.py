"""
Auth Router — 3 authentication flows:
  A. Google OAuth 2.0 (via Supabase)
  B. Mobile Phone + OTP (Custom SMS Gateway)
  C. Email + Verification Code
"""
import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.auth import (
    ProfileResponse,
    SendEmailCodeRequest,
    SendOTPRequest,
    TokenResponse,
    UpdateProfileRequest,
    VerifyEmailCodeRequest,
    VerifyOTPRequest,
)
from app.schemas.common import APIResponse
from app.services.email_service import send_verification_code
from app.services.sms_gateway import send_otp_sms

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def _generate_code(length: int = 6) -> str:
    """Generate a numeric OTP / verification code."""
    return "".join(random.choices(string.digits, k=length))


# ─────────────────────────────────────────────────────────
# FLOW B: Mobile OTP
# ─────────────────────────────────────────────────────────

@router.post("/otp/send", response_model=APIResponse)
async def send_otp(body: SendOTPRequest):
    """Generate a 6-digit OTP and send it via the local mobile SMS gateway."""
    db = get_supabase()
    otp_code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate any existing unused OTPs for this phone
    db.table("otp_sessions").update({"is_used": True}).eq("phone", body.phone).eq("is_used", False).execute()

    # Store the new OTP
    db.table("otp_sessions").insert({
        "phone": body.phone,
        "otp_code": otp_code,
        "expires_at": expires_at.isoformat(),
    }).execute()

    # Send via mobile gateway
    try:
        await send_otp_sms(body.phone, otp_code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"SMS gateway error: {str(e)}",
        )

    return APIResponse(message=f"OTP sent to {body.phone}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes.")


@router.post("/otp/verify", response_model=APIResponse[TokenResponse])
async def verify_otp(body: VerifyOTPRequest):
    """Verify the OTP and issue a JWT. Creates a profile if first login."""
    db = get_supabase()
    now = datetime.now(timezone.utc)

    result = (
        db.table("otp_sessions")
        .select("*")
        .eq("phone", body.phone)
        .eq("otp_code", body.otp_code)
        .eq("is_used", False)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP.")

    session = result.data[0]
    if datetime.fromisoformat(session["expires_at"]) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired.")

    # Mark as used
    db.table("otp_sessions").update({"is_used": True}).eq("id", session["id"]).execute()

    # Upsert profile
    profile_result = db.table("profiles").select("*").eq("phone", body.phone).execute()
    if profile_result.data:
        profile = profile_result.data[0]
    else:
        import uuid
        new_id = str(uuid.uuid4())
        profile = {"id": new_id, "phone": body.phone, "auth_provider": "phone", "role": "user"}
        db.table("profiles").insert(profile).execute()

    token = create_access_token(
        subject=profile["id"],
        extra={"role": profile.get("role", "user"), "phone": body.phone},
    )

    return APIResponse(
        message="Login successful.",
        data=TokenResponse(access_token=token, user_id=profile["id"], role=profile.get("role", "user")),
    )


# ─────────────────────────────────────────────────────────
# FLOW C: Email Verification Code
# ─────────────────────────────────────────────────────────

@router.post("/email/send-code", response_model=APIResponse)
async def send_email_code(body: SendEmailCodeRequest):
    """Generate a 6-digit code and send it to the user's email."""
    db = get_supabase()
    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.EMAIL_CODE_EXPIRY_MINUTES)

    # Invalidate existing codes
    db.table("email_sessions").update({"is_used": True}).eq("email", str(body.email)).eq("is_used", False).execute()

    db.table("email_sessions").insert({
        "email": str(body.email),
        "code": code,
        "expires_at": expires_at.isoformat(),
    }).execute()

    try:
        await send_verification_code(str(body.email), code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Email sending failed: {str(e)}",
        )

    return APIResponse(message=f"Verification code sent to {body.email}.")


@router.post("/email/verify", response_model=APIResponse[TokenResponse])
async def verify_email_code(body: VerifyEmailCodeRequest):
    """Verify the email code and issue a JWT."""
    db = get_supabase()
    now = datetime.now(timezone.utc)

    result = (
        db.table("email_sessions")
        .select("*")
        .eq("email", str(body.email))
        .eq("code", body.code)
        .eq("is_used", False)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code.")

    session = result.data[0]
    if datetime.fromisoformat(session["expires_at"]) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code has expired.")

    db.table("email_sessions").update({"is_used": True}).eq("id", session["id"]).execute()

    # Upsert profile
    profile_result = db.table("profiles").select("*").eq("email", str(body.email)).execute()
    if profile_result.data:
        profile = profile_result.data[0]
    else:
        import uuid
        new_id = str(uuid.uuid4())
        profile = {"id": new_id, "email": str(body.email), "auth_provider": "email", "role": "user"}
        db.table("profiles").insert(profile).execute()

    token = create_access_token(
        subject=profile["id"],
        extra={"role": profile.get("role", "user"), "email": str(body.email)},
    )
    return APIResponse(
        message="Login successful.",
        data=TokenResponse(access_token=token, user_id=profile["id"], role=profile.get("role", "user")),
    )


# ─────────────────────────────────────────────────────────
# FLOW A: Google OAuth (Supabase-managed)
# ─────────────────────────────────────────────────────────

@router.get("/google")
async def google_login():
    """
    Returns the Supabase Google OAuth URL.
    The frontend should redirect the user to this URL.
    """
    db = get_supabase()
    result = db.auth.sign_in_with_oauth({"provider": "google"})
    return {"url": result.url}


@router.get("/google/callback")
async def google_callback(code: str):
    """
    Handle Google OAuth callback.
    Supabase exchanges the code for a session.
    """
    db = get_supabase()
    try:
        session = db.auth.exchange_code_for_session({"auth_code": code})
        user = session.user
        supabase_token = session.session.access_token

        # Upsert profile
        profile_data = {
            "id": user.id,
            "email": user.email,
            "full_name": user.user_metadata.get("full_name"),
            "avatar_url": user.user_metadata.get("avatar_url"),
            "auth_provider": "google",
            "role": "user",
        }
        db.table("profiles").upsert(profile_data).execute()

        # Issue our own JWT so all auth flows are uniform
        token = create_access_token(
            subject=user.id,
            extra={"role": "user", "email": user.email},
        )
        return APIResponse(
            message="Google login successful.",
            data=TokenResponse(access_token=token, user_id=user.id, role="user"),
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ─────────────────────────────────────────────────────────
# Profile & Logout
# ─────────────────────────────────────────────────────────

@router.get("/me", response_model=APIResponse[ProfileResponse])
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return the current user's profile."""
    db = get_supabase()
    result = db.table("profiles").select("*").eq("id", current_user["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return APIResponse(data=ProfileResponse(**result.data[0]))


@router.patch("/me", response_model=APIResponse[ProfileResponse])
async def update_profile(body: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update the current user's profile fields."""
    db = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    result = db.table("profiles").update(updates).eq("id", current_user["sub"]).select("*").execute()
    return APIResponse(message="Profile updated.", data=ProfileResponse(**result.data[0]))


@router.post("/logout", response_model=APIResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    JWT is stateless — logout is handled client-side by discarding the token.
    This endpoint exists as a clean contract for the frontend.
    """
    return APIResponse(message="Logged out successfully. Please discard your token.")
