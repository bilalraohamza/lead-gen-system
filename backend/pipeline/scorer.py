from datetime import datetime


def score_lead(lead: dict, classification: dict) -> float:
    """
    Rule-based scoring formula. Returns a score from 0 to 100.
    Higher score = better lead quality.
    """
    score = 0.0

    # 1. Relevance (most important gate)
    if not classification.get("is_relevant"):
        return 0.0  # irrelevant leads get 0 immediately

    # 2. Intent label
    intent = classification.get("intent_label", "maybe")
    if intent == "hiring":
        score += 30
    elif intent == "maybe":
        score += 10
    elif intent == "not_hiring":
        return 0.0  # someone selling services, not worth pursuing

    # 3. Budget mentioned
    if classification.get("budget_text"):
        score += 25

    # 4. Urgency
    urgency = classification.get("urgency", "low")
    if urgency == "high":
        score += 20
    elif urgency == "medium":
        score += 10

    # 5. Recency (when was the post made)
    posted_at = lead.get("posted_at")
    if posted_at:
        age_hours = (datetime.utcnow() - posted_at).total_seconds() / 3600
        if age_hours <= 6:
            score += 15
        elif age_hours <= 24:
            score += 10
        elif age_hours <= 48:
            score += 5

    # 6. Source quality
    source = lead.get("source", "")
    if source == "remoteok":
        score += 8
    elif source == "hackernews":
        score += 6
    elif source == "reddit":
        score += 4

    # 7. Specific service match
    if classification.get("specific_service"):
        score += 2

    return round(min(score, 100.0), 1)