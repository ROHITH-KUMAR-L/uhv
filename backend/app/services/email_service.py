"""
Email Service — sends verification codes via SMTP or Resend API.
Provider is selected by EMAIL_PROVIDER env var ('smtp' or 'resend').
"""
import aiosmtplib
from email.message import EmailMessage

import httpx

from app.core.config import get_settings

settings = get_settings()

_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:10px;padding:30px;">
    <h2 style="color:#e74c3c;">🛡️ ScamShield</h2>
    <p>Your verification code is:</p>
    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2c3e50;text-align:center;padding:16px 0;">{code}</div>
    <p style="color:#888;">This code expires in {expiry} minutes. Do not share it with anyone.</p>
    <hr/>
    <p style="font-size:12px;color:#aaa;">If you did not request this, ignore this email.</p>
  </div>
</body>
</html>
"""


async def send_verification_code(email: str, code: str) -> bool:
    """Route to the configured email provider."""
    if settings.EMAIL_PROVIDER == "resend":
        return await _send_via_resend(email, code)
    return await _send_via_smtp(email, code)


async def _send_via_resend(email: str, code: str) -> bool:
    html_body = _EMAIL_TEMPLATE.format(
        code=code, expiry=settings.EMAIL_CODE_EXPIRY_MINUTES
    )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.FROM_EMAIL,
                "to": [email],
                "subject": "ScamShield — Your Verification Code",
                "html": html_body,
            },
        )
        resp.raise_for_status()
    return True


async def _send_via_smtp(email: str, code: str) -> bool:
    html_body = _EMAIL_TEMPLATE.format(
        code=code, expiry=settings.EMAIL_CODE_EXPIRY_MINUTES
    )
    msg = EmailMessage()
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = email
    msg["Subject"] = "ScamShield — Your Verification Code"
    msg.set_type("text/html")
    msg.set_payload(html_body, charset="utf-8")

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        start_tls=True,
    )
    return True
