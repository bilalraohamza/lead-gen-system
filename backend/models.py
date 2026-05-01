from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from datetime import datetime
from database import Base


class Lead(Base):
    __tablename__ = "leads"

    id                    = Column(Integer, primary_key=True, index=True)
    source                = Column(String, nullable=False)
    title                 = Column(String, nullable=False)
    body                  = Column(Text, nullable=True)
    url                   = Column(String, nullable=False, unique=True)
    author                = Column(String, nullable=True)
    subreddit             = Column(String, nullable=True)
    contact_email         = Column(String, nullable=True)

    score                 = Column(Float, default=0.0)
    intent_label          = Column(String, default="unscored")
    budget_mentioned      = Column(Boolean, default=False)
    budget_text           = Column(String, nullable=True)
    classification_reason = Column(String, nullable=True)
    specific_service      = Column(String, nullable=True)

    status                = Column(String, default="new")
    outreach_message      = Column(Text, nullable=True)

    posted_at             = Column(DateTime, nullable=True)
    collected_at          = Column(DateTime, default=datetime.utcnow)