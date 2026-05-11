from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ScamType(str, Enum):
    phishing = "phishing"
    upi = "upi"
    job_fraud = "job_fraud"
    otp = "otp"
    identity_theft = "identity_theft"
    tech_support = "tech_support"
    fake_banking = "fake_banking"
    other = "other"


class ScamPlatform(str, Enum):
    whatsapp = "whatsapp"
    email = "email"
    sms = "sms"
    instagram = "instagram"
    facebook = "facebook"
    telegram = "telegram"
    phone_call = "phone_call"
    other = "other"


class ReportStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class CreateReportRequest(BaseModel):
    scam_type: ScamType
    platform: ScamPlatform
    description: str
    phone_email_used: Optional[str] = None
    financial_loss_inr: Optional[int] = None
    evidence_base64: Optional[str] = None   # Small screenshots only


class UpdateReportStatusRequest(BaseModel):
    status: ReportStatus


class ReportResponse(BaseModel):
    id: str
    user_id: str
    scam_type: str
    platform: str
    description: str
    phone_email_used: Optional[str]
    financial_loss_inr: Optional[int]
    evidence_base64: Optional[str]
    status: str
    upvotes: int
    created_at: str
