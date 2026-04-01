# FULL FILE
from fastapi import APIRouter

router = APIRouter(prefix="/publishers", tags=["publishers"])

@router.get("/profile")
async def get_profile(): return {"company_name": "Demo Publisher"}
@router.post("/profile")
async def upsert_profile(payload: dict): return payload
@router.get("/sites")
async def list_sites(): return []
@router.post("/sites")
async def create_site(payload: dict): return payload
@router.get("/apps")
async def list_apps(): return []
@router.post("/apps")
async def create_app(payload: dict): return payload
@router.get("/placements")
async def list_placements(): return []
@router.post("/placements")
async def create_placement(payload: dict): return payload
@router.get("/slots")
async def list_slots(): return []
@router.post("/slots")
async def create_slot(payload: dict): return payload
