def split_revenue(gross_cost, revenue_share_pct):
    publisher_share = gross_cost * (revenue_share_pct / 100)
    return publisher_share, gross_cost - publisher_share
async def apply_ad_spend(db, campaign, slot, gross_cost, event_type, reference_id):
    return 0
async def write_delivery_log(db, event_type, campaign_id, ad_id, slot_id, gross_cost, publisher_share, request_id, description):
    return None
