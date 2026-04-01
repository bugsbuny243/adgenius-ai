# FULL FILE
import hashlib
import json
import redis
from app.config import settings

client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def score_slot_campaign_match(slot_ctx: dict, campaign_ctx: dict) -> float:
    cache_key = "match:" + hashlib.md5(json.dumps([slot_ctx, campaign_ctx], sort_keys=True).encode()).hexdigest()
    cached = client.get(cache_key)
    if cached:
        return float(cached)
    score = 0.5
    if slot_ctx.get("category") and slot_ctx.get("category") == campaign_ctx.get("category"):
        score = 0.8
    client.setex(cache_key, 300, score)
    return score
