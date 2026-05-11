from pydantic import BaseModel, EmailStr, field_validator
import re


# ---------- OTP / Phone ----------

class SendOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[^\d+]", "", v)
        if not re.match(r"^\+?[1-9]\d{9,14}$", cleaned):
            raise ValueError("Invalid phone number format.")
        return cleaned


class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str


# ---------- Email Code ----------

class SendEmailCodeRequest(BaseModel):
    email: EmailStr


class VerifyEmailCodeRequest(BaseModel):
    email: EmailStr
    code: str


# ---------- Google OAuth ----------

class GoogleCallbackRequest(BaseModel):
    code: str
    state: str | None = None


# ---------- Responses ----------

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


class ProfileResponse(BaseModel):
    id: str
    full_name: str | None
    phone: str | None
    email: str | None
    avatar_url: str | None
    auth_provider: str
    role: str
    cyber_safety_score: int
    created_at: str


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
