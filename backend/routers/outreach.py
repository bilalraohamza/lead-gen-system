from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.lead_service import get_lead_by_id, update_outreach_message, update_lead_status
from services.outreach import generate_outreach_message

router = APIRouter(prefix="/outreach", tags=["outreach"])


@router.post("/{lead_id}/generate")
def generate_message(lead_id: int, db: Session = Depends(get_db)):
    """
    Generates a personalized outreach message for a lead.
    Saves it to the database and returns it.
    """
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "title": lead.title,
        "body": lead.body,
        "source": lead.source,
        "budget_text": lead.budget_text,
        "specific_service": lead.specific_service,
    }

    message = generate_outreach_message(lead_dict)

    # Save generated message to database
    update_outreach_message(db, lead_id, message)

    return {
        "lead_id": lead_id,
        "title": lead.title,
        "message": message,
    }


@router.patch("/{lead_id}/mark-sent")
def mark_as_sent(lead_id: int, db: Session = Depends(get_db)):
    """
    Marks a lead as contacted after you send the message manually.
    """
    lead = update_lead_status(db, lead_id, "contacted")
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead marked as contacted", "lead_id": lead_id}


@router.get("/{lead_id}/message")
def get_saved_message(lead_id: int, db: Session = Depends(get_db)):
    """
    Returns the previously generated outreach message for a lead.
    """
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.outreach_message:
        raise HTTPException(status_code=404, detail="No message generated yet for this lead")

    return {
        "lead_id": lead_id,
        "title": lead.title,
        "message": lead.outreach_message,
        "status": lead.status,
    }