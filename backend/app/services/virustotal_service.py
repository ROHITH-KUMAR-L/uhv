"""
VirusTotal Service — URL and File (hash-based) scanning.
Uses VirusTotal Public API v3.
"""
import hashlib
import asyncio
from pathlib import Path

import httpx

from app.core.config import get_settings
from app.schemas.detect import VirusTotalURLResult, VirusTotalFileResult

settings = get_settings()

VT_BASE = "https://www.virustotal.com/api/v3"
_HEADERS = {"x-apikey": settings.VIRUSTOTAL_API_KEY}

# Max polling attempts for file scan (VT scans asynchronously)
_MAX_POLLS = 10
_POLL_INTERVAL = 15   # seconds


async def scan_url(url: str) -> VirusTotalURLResult:
    """Submit a URL to VirusTotal and return the analysis summary."""
    async with httpx.AsyncClient(timeout=30) as client:
        # Step 1: Submit URL for scanning
        submit_resp = await client.post(
            f"{VT_BASE}/urls",
            headers=_HEADERS,
            data={"url": url},
        )
        submit_resp.raise_for_status()
        analysis_id = submit_resp.json()["data"]["id"]

        # Step 2: Retrieve the result
        result_resp = await client.get(
            f"{VT_BASE}/analyses/{analysis_id}",
            headers=_HEADERS,
        )
        result_resp.raise_for_status()
        stats = result_resp.json()["data"]["attributes"]["stats"]

        return VirusTotalURLResult(
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            clean=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total_engines=sum(stats.values()),
            permalink=f"https://www.virustotal.com/gui/url/{analysis_id}",
        )


def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 hash of a local file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


async def _get_file_report(sha256: str) -> VirusTotalFileResult | None:
    """Try fetching an existing VirusTotal report by hash. Returns None if not found."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{VT_BASE}/files/{sha256}", headers=_HEADERS)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        attrs = resp.json()["data"]["attributes"]
        stats = attrs.get("last_analysis_stats", {})
        return VirusTotalFileResult(
            sha256=sha256,
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            clean=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total_engines=sum(stats.values()),
            permalink=f"https://www.virustotal.com/gui/file/{sha256}",
        )


async def scan_file(file_path: Path, file_name: str) -> VirusTotalFileResult:
    """
    Scan a local file against VirusTotal.
    1. Compute SHA-256 → check cached report.
    2. If unknown → upload file → poll for result.
    3. Delete temp file after scanning.
    """
    sha256 = compute_sha256(file_path)

    # Check if VT already has a report for this hash
    cached = await _get_file_report(sha256)
    if cached:
        cached.file_name = file_name
        file_path.unlink(missing_ok=True)  # Delete temp file
        return cached

    # Upload file to VirusTotal
    async with httpx.AsyncClient(timeout=120) as client:
        with open(file_path, "rb") as f:
            upload_resp = await client.post(
                f"{VT_BASE}/files",
                headers=_HEADERS,
                files={"file": (file_name, f)},
            )
        upload_resp.raise_for_status()
        analysis_id = upload_resp.json()["data"]["id"]

    # Delete temp file immediately after upload
    file_path.unlink(missing_ok=True)

    # Poll for the result
    for attempt in range(_MAX_POLLS):
        await asyncio.sleep(_POLL_INTERVAL)
        async with httpx.AsyncClient(timeout=30) as client:
            poll_resp = await client.get(
                f"{VT_BASE}/analyses/{analysis_id}",
                headers=_HEADERS,
            )
            poll_resp.raise_for_status()
            analysis = poll_resp.json()["data"]
            if analysis["attributes"]["status"] == "completed":
                stats = analysis["attributes"]["stats"]
                return VirusTotalFileResult(
                    sha256=sha256,
                    file_name=file_name,
                    malicious=stats.get("malicious", 0),
                    suspicious=stats.get("suspicious", 0),
                    clean=stats.get("harmless", 0),
                    undetected=stats.get("undetected", 0),
                    total_engines=sum(stats.values()),
                    permalink=f"https://www.virustotal.com/gui/file/{sha256}",
                )

    # Timeout fallback — VT scan took too long
    return VirusTotalFileResult(
        sha256=sha256,
        file_name=file_name,
        permalink=f"https://www.virustotal.com/gui/file/{sha256}",
    )
