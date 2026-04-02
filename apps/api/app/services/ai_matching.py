import random


async def score_slot_campaign_match(slot, campaign, db) -> float:
    score = 0.5
    if getattr(slot, "category", None) and getattr(campaign, "category", None):
        if slot.category == campaign.category:
            score += 0.35
    score += random.random() * 0.1
    return min(score, 1.0)
