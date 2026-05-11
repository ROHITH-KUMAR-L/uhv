"""
SMS Gateway Service — sends OTP via your local mobile server.
The mobile server is expected to expose an HTTP endpoint that
accepts a POST request and sends an SMS from the device SIM.
"""
import httpx
from app.core.config import get_settings

settings = get_settings()


async def send_otp_sms(phone: str, otp_code: str) -> bool:
    """
    POST to the local mobile server with the OTP message.

    Expected mobile server request format:
    {
        "to": "+91XXXXXXXXXX",
        "message": "Your ScamShield OTP is: 123456. Valid for 5 minutes."
    }

    Returns True on success, raises on failure.
    """
    message = f"Your ScamShield OTP is: {otp_code}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone."

    payload: dict = {"to": phone, "message": message}

    # Add shared secret header if configured
    headers = {"Content-Type": "application/json"}
    if settings.SMS_GATEWAY_SECRET:
        headers["X-Gateway-Secret"] = settings.SMS_GATEWAY_SECRET

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            settings.SMS_GATEWAY_URL,
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()

    return True
