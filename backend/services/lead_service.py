from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import Lead
from datetime import datetime


def save_lead(db: Session, lead: dict) -> Lead | None:
    """
    Saves a single processed lead to SQLite.
    Returns None if lead already exists (duplicate URL).
    """
    try:
        db_lead = Lead(
            source                = lead.get("source"),
            title                 = lead.get("title"),
            body                  = lead.get("body", ""),
            url                   = lead.get("url"),
            author                = lead.get("author"),
            subreddit             = lead.get("subreddit"),
            contact_email         = lead.get("contact_email"),
            score                 = lead.get("score", 0.0),
            intent_label          = lead.get("intent_label", "unscored"),
            budget_mentioned      = lead.get("budget_mentioned", False),
            budget_text           = lead.get("budget_text"),
            classification_reason = lead.get("classification_reason"),
            specific_service      = lead.get("specific_service"),
            status                = "new",
            posted_at             = lead.get("posted_at", datetime.utcnow()),
        )

        db.add(db_lead)
        db.commit()
        db.refresh(db_lead)
        return db_lead

    except IntegrityError:
        db.rollback()
        return None  # duplicate URL, already exists


def save_leads_bulk(db: Session, leads: list[dict]) -> dict:
    """
    Saves multiple leads. Returns a summary of saved vs skipped.
    """
    saved = 0
    skipped = 0

    for lead in leads:
        result = save_lead(db, lead)
        if result:
            saved += 1
        else:
            skipped += 1

    return {"saved": saved, "skipped_duplicates": skipped}


def get_leads(
    db: Session,
    source: str = None,
    intent: str = None,
    status: str = None,
    category: str = None,
    min_score: float = 0.0,
    search: str = None,
    sort_by: str = "score",
    sort_dir: str = "desc",
    limit: int = 50,
    offset: int = 0,
) -> list[Lead]:
    query = db.query(Lead)

    if source:
        query = query.filter(Lead.source == source)
    if intent:
        query = query.filter(Lead.intent_label == intent)
    if status:
        query = query.filter(Lead.status == status)
    if category:
        query = query.filter(Lead.specific_service == category)
    if min_score > 0:
        query = query.filter(Lead.score >= min_score)
    if search:
        query = query.filter(Lead.title.ilike(f"%{search}%"))

    sort_column = {
        "score":        Lead.score,
        "date":         Lead.collected_at,
        "posted_at":    Lead.posted_at,
    }.get(sort_by, Lead.score)

    if sort_dir == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.offset(offset).limit(limit).all()


def get_lead_by_id(db: Session, lead_id: int) -> Lead | None:
    return db.query(Lead).filter(Lead.id == lead_id).first()


def update_lead_status(db: Session, lead_id: int, status: str) -> Lead | None:
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        return None
    lead.status = status
    db.commit()
    db.refresh(lead)
    return lead


def update_outreach_message(db: Session, lead_id: int, message: str) -> Lead | None:
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        return None
    lead.outreach_message = message
    db.commit()
    db.refresh(lead)
    return lead


def get_stats(db: Session) -> dict:
    """
    Returns summary stats for the dashboard.
    """
    total = db.query(Lead).count()
    high_intent = db.query(Lead).filter(Lead.intent_label == "hiring").count()
    contacted = db.query(Lead).filter(Lead.status == "contacted").count()
    new_today = db.query(Lead).filter(
        Lead.collected_at >= datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    ).count()

    return {
        "total_leads": total,
        "high_intent": high_intent,
        "contacted": contacted,
        "new_today": new_today,
    }