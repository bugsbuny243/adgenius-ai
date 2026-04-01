# FULL FILE
from app.services.ai_matching import score_slot_campaign_match

def select_best_ad(ads: list[dict], slot_ctx: dict) -> dict | None:
    best = None
    best_score = -1.0
    for ad in ads:
        score = score_slot_campaign_match(slot_ctx, ad.get("campaign", {})) if ad.get("campaign") else 0.5
        if score > best_score:
            best_score = score
            best = ad
    return best
