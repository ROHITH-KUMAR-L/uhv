from supabase import create_client, Client
from functools import lru_cache
from app.core.config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return client
