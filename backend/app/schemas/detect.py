from pydantic import BaseModel, HttpUrl
from typing import Optional


class AnalyzeRequest(BaseModel):
    """Main detection request — all fields are optional, at least one must be provided."""
    text: Optional[str] = None
    url: Optional[str] = None
    image_base64: Optional[str] = None   # data:image/png;base64,...

    def has_content(self) -> bool:
        return any([self.text, self.url, self.image_base64])


class URLScanRequest(BaseModel):
    url: str


class VirusTotalURLResult(BaseModel):
    malicious: int = 0
    suspicious: int = 0
    clean: int = 0
    undetected: int = 0
    total_engines: int = 0
    permalink: Optional[str] = None


class VirusTotalFileResult(BaseModel):
    sha256: str
    malicious: int = 0
    suspicious: int = 0
    clean: int = 0
    undetected: int = 0
    total_engines: int = 0
    file_name: Optional[str] = None
    permalink: Optional[str] = None


class GeminiAnalysis(BaseModel):
    verdict: str                         # "SCAM" | "SUSPICIOUS" | "SAFE" | "UNKNOWN"
    confidence: float                    # 0.0 – 1.0
    summary: str
    suspicious_phrases: list[str] = []
    psychological_tactics: list[str] = []
    recommended_actions: list[str] = []


class DetectionResult(BaseModel):
    detection_id: str
    input_type: str                      # text | url | file | image | mixed
    risk_score: int                      # 0-100
    risk_level: str                      # safe | low | medium | high | critical
    summary: str
    suspicious_phrases: list[str]
    recommended_actions: list[str]
    gemini: Optional[GeminiAnalysis] = None
    virustotal_url: Optional[VirusTotalURLResult] = None
    virustotal_file: Optional[VirusTotalFileResult] = None


class DetectionHistoryItem(BaseModel):
    id: str
    input_type: str
    risk_score: int
    risk_level: str
    summary: str
    created_at: str
