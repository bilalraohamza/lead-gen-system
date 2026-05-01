from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Lead
from services.telegram_bot import send_daily_summary
from services.lead_service import (
    get_leads,
    get_lead_by_id,
    update_lead_status,
    get_stats,
)

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/")
def list_leads(
    source: str = Query(None),
    intent: str = Query(None),
    status: str = Query(None),
    category: str = Query(None),
    search: str = Query(None),
    sort_by: str = Query("score"),
    sort_dir: str = Query("desc"),
    min_score: float = Query(0.0),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    leads = get_leads(
        db,
        source=source,
        intent=intent,
        status=status,
        category=category,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        min_score=min_score,
        limit=limit,
        offset=offset,
    )
    return {"leads": [lead.__dict__ for lead in leads], "count": len(leads)}


@router.get("/stats")
def lead_stats(db: Session = Depends(get_db)):
    return get_stats(db)


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """
    Returns distinct service categories found in the database.
    Used to populate the category filter dropdown in the frontend.
    """
    results = db.query(Lead.specific_service)\
        .filter(Lead.specific_service != None)\
        .distinct()\
        .all()
    categories = sorted([r[0] for r in results if r[0]])
    return {"categories": categories}


@router.get("/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead.__dict__


@router.patch("/{lead_id}/status")
def update_status(
    lead_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
):
    valid_statuses = ["new", "reviewed", "contacted", "closed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    lead = update_lead_status(db, lead_id, status)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Status updated", "lead_id": lead_id, "status": status}

@router.post("/notify/daily")
def trigger_daily_summary(db: Session = Depends(get_db)):
    """
    Manually trigger a daily summary to Telegram.
    Will also be called automatically by the scheduler.
    """
    leads = get_leads(db, min_score=30, limit=10)
    send_daily_summary(leads)
    return {"message": f"Daily summary sent with {len(leads)} leads"}
