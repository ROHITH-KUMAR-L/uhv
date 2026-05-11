from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # --- Supabase ---
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str

    # --- Google Gemini ---
    GEMINI_API_KEY: str

    # --- VirusTotal ---
    VIRUSTOTAL_API_KEY: str

    # --- SMS Gateway (Local Mobile Server) ---
    SMS_GATEWAY_URL: str
    SMS_GATEWAY_SECRET: str = ""

    # --- Email ---
    EMAIL_PROVIDER: str = "smtp"   # 'smtp' or 'resend'
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    FROM_EMAIL: str = "noreply@scamshield.app"

    # --- App ---
    APP_ENV: str = "development"
    # Comma-separated list: http://localhost:3000,https://scamshield.app
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    FILE_MAX_SIZE_MB: int = 60
    TEMP_FILE_DIR: str = "/tmp/scamshield"
    OTP_EXPIRY_MINUTES: int = 5
    EMAIL_CODE_EXPIRY_MINUTES: int = 10

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def max_file_bytes(self) -> int:
        return self.FILE_MAX_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
