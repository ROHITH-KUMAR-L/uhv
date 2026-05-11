"""
Gemini Service — Text + Vision (multimodal) scam analysis.
Uses google-generativeai SDK with a structured prompt to return
a JSON analysis that maps to GeminiAnalysis schema.
"""
import json
import base64
import re

import google.generativeai as genai
from PIL import Image
import io

from app.core.config import get_settings
from app.schemas.detect import GeminiAnalysis

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)

# Use gemini-1.5-flash for speed; swap to gemini-1.5-pro for accuracy
_model = genai.GenerativeModel("gemini-1.5-flash")

_SYSTEM_PROMPT = """
You are ScamShield AI, an expert cybersecurity analyst specializing in online scams, phishing, and digital fraud.

Analyze the provided content (text, image, or both) and return a JSON object with EXACTLY the following structure:

{
  "verdict": "SCAM" | "SUSPICIOUS" | "SAFE" | "UNKNOWN",
  "confidence": <float between 0.0 and 1.0>,
  "summary": "<one or two sentence human-readable verdict>",
  "suspicious_phrases": ["<phrase1>", "<phrase2>"],
  "psychological_tactics": ["<tactic1>", "<tactic2>"],
  "recommended_actions": ["<action1>", "<action2>"]
}

Focus on:
- Urgency and fear tactics ("Your account will be blocked", "Act now")
- Financial manipulation ("You have won", "Send money to claim prize")
- OTP / password harvesting requests
- Impersonation of banks, government, courier services
- Fake KYC / Aadhaar / UPI requests
- Fraudulent job or investment offers
- URL spoofing and phishing indicators

If an image is provided, perform visual analysis too:
- Fake banking app UIs
- Fraudulent QR codes
- Spoofed login pages
- Fake official logos

Return ONLY the JSON object. No markdown, no explanation outside JSON.
"""


def _extract_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON from Gemini response."""
    raw = raw.strip()
    # Remove ```json ... ``` fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


async def analyze_text(text: str) -> GeminiAnalysis:
    """Analyze plain text or SMS/email content for scam indicators."""
    prompt = f"{_SYSTEM_PROMPT}\n\nContent to analyze:\n{text}"
    response = _model.generate_content(prompt)
    data = _extract_json(response.text)
    return GeminiAnalysis(**data)


async def analyze_image_base64(image_base64: str, text_context: str = "") -> GeminiAnalysis:
    """
    Analyze a Base64-encoded image (with optional surrounding text).
    image_base64 should be like: 'data:image/png;base64,<data>'
    """
    # Strip the data-URI prefix
    if "," in image_base64:
        header, b64_data = image_base64.split(",", 1)
        mime = header.split(":")[1].split(";")[0]  # e.g. image/png
    else:
        b64_data = image_base64
        mime = "image/png"

    image_bytes = base64.b64decode(b64_data)
    image = Image.open(io.BytesIO(image_bytes))

    parts = [
        _SYSTEM_PROMPT,
        f"\nAdditional context text: {text_context}" if text_context else "",
        "\nAnalyze this image for scam indicators:",
        image,
    ]
    response = _model.generate_content(parts)
    data = _extract_json(response.text)
    return GeminiAnalysis(**data)


async def analyze_combined(text: str | None, image_base64: str | None) -> GeminiAnalysis:
    """Route to the correct analysis method based on what content is provided."""
    if image_base64 and text:
        return await analyze_image_base64(image_base64, text_context=text)
    elif image_base64:
        return await analyze_image_base64(image_base64)
    elif text:
        return await analyze_text(text)
    else:
        return GeminiAnalysis(
            verdict="UNKNOWN",
            confidence=0.0,
            summary="No content was provided for analysis.",
        )
