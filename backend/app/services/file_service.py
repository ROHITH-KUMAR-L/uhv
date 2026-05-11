"""
File Service — handles temp file storage for VirusTotal scanning.
Files are written to a local temp directory, scanned, then deleted.
Nothing is ever persisted to Supabase Storage.
"""
import uuid
import aiofiles
from pathlib import Path
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

settings = get_settings()


def get_temp_dir() -> Path:
    """Return (and create if needed) the temp scan directory."""
    path = Path(settings.TEMP_FILE_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_temp_file(upload: UploadFile) -> Path:
    """
    Save an uploaded file to a unique temp path for scanning.
    Validates size against FILE_MAX_SIZE_MB before writing.
    Returns the path to the temp file.
    """
    temp_dir = get_temp_dir()
    suffix = Path(upload.filename or "upload").suffix
    temp_path = temp_dir / f"{uuid.uuid4()}{suffix}"

    total_bytes = 0
    max_bytes = settings.max_file_bytes

    async with aiofiles.open(temp_path, "wb") as out:
        while chunk := await upload.read(65536):   # 64 KB chunks
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                # Clean up partial file
                temp_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size of {settings.FILE_MAX_SIZE_MB}MB.",
                )
            await out.write(chunk)

    return temp_path


def cleanup_temp_file(path: Path) -> None:
    """Safely remove a temp file (no-op if already deleted)."""
    path.unlink(missing_ok=True)
