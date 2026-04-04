from supabase import create_client

from app.config import settings

_client = None


def get_supabase():
    global _client
    if not _client:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client
