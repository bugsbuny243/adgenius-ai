from app.config import settings


REQUIRED_ENV = {
    "GEMINI_API_KEY": settings.GEMINI_API_KEY,
    "GOOGLE_ADS_DEVELOPER_TOKEN": settings.GOOGLE_ADS_DEVELOPER_TOKEN,
    "GOOGLE_ADS_CUSTOMER_ID": settings.GOOGLE_ADS_CUSTOMER_ID,
    "GOOGLE_ADS_LOGIN_CUSTOMER_ID": settings.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    "GOOGLE_ADS_CLIENT_ID": settings.GOOGLE_ADS_CLIENT_ID,
    "GOOGLE_ADS_CLIENT_SECRET": settings.GOOGLE_ADS_CLIENT_SECRET,
    "GOOGLE_ADS_REFRESH_TOKEN": settings.GOOGLE_ADS_REFRESH_TOKEN,
}


def get_ad_stack_setup_status() -> dict:
    missing = [key for key, value in REQUIRED_ENV.items() if not value]

    return {
        "stack": {
            "ad_network": "Google Ads",
            "ai_engine": "Gemini",
        },
        "ready": len(missing) == 0,
        "missing_env": missing,
        "next_steps": [
            "Google Ads API developer token, OAuth client and refresh token bilgilerini gir.",
            "Gemini API key ekle ve yaratıcı üretim endpointlerini aktif et.",
            "/api/v1/adstack/setup endpointini tekrar çağırarak kurulum durumunu doğrula.",
        ],
    }
