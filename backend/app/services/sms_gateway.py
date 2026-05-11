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
    try:
        # Add shared secret header if configured
        headers = {"Content-Type": "application/json"}
        if settings.SMS_GATEWAY_SECRET:
            headers["X-Gateway-Secret"] = settings.SMS_GATEWAY_SECRET

        # Construct the message text
        message_text = f"Your ScamShield OTP is: {otp_code}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone."
        
        # The payload your mobile app expects: {"phone": "...", "message": "..."}
        payload = {
            "phone": phone,
            "message": message_text
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.SMS_GATEWAY_URL,
                json=payload,
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code != 200:
                print(f"SMS Gateway Error: {response.status_code} - {response.text}")
                return False
            
            return True
    except Exception as e:
        print(f"SMS Gateway Exception: {str(e)}")
        return False
