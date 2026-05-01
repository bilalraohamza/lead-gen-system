import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from config_manager import load_config, save_config, update_value
from services.outreach import OUTREACH_MODELS
import requests as http_requests

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateListRequest(BaseModel):
    items: List[str]


class UpdateValueRequest(BaseModel):
    value: str


class UpdateScoreRequest(BaseModel):
    value: int


class SuggestRequest(BaseModel):
    category: str
    type: str


@router.get("/")
def get_settings():
    return load_config()


@router.post("/reset")
def reset_settings():
    from config_manager import DEFAULT_CONFIG, save_config
    save_config(DEFAULT_CONFIG)
    return {"message": "Settings reset to defaults"}


# Service Categories
@router.get("/categories")
def get_categories():
    return {"categories": load_config().get("service_categories", [])}


@router.post("/categories")
def update_categories(request: UpdateListRequest):
    config = update_value("service_categories", request.items)
    return {"categories": config["service_categories"]}


# Subreddits
@router.get("/subreddits")
def get_subreddits():
    return {"subreddits": load_config().get("target_subreddits", [])}


@router.post("/subreddits")
def update_subreddits(request: UpdateListRequest):
    config = update_value("target_subreddits", request.items)
    return {"subreddits": config["target_subreddits"]}


# Include Keywords
@router.get("/keywords/include")
def get_include_keywords():
    return {"keywords": load_config().get("include_keywords", [])}


@router.post("/keywords/include")
def update_include_keywords(request: UpdateListRequest):
    config = update_value("include_keywords", request.items)
    return {"keywords": config["include_keywords"]}


# Blacklist Keywords
@router.get("/keywords/blacklist")
def get_blacklist_keywords():
    return {"keywords": load_config().get("blacklist_keywords", [])}


@router.post("/keywords/blacklist")
def update_blacklist_keywords(request: UpdateListRequest):
    config = update_value("blacklist_keywords", request.items)
    return {"keywords": config["blacklist_keywords"]}


# Custom URLs
@router.get("/urls")
def get_custom_urls():
    return {"urls": load_config().get("custom_urls", [])}


@router.post("/urls")
def update_custom_urls(request: UpdateListRequest):
    config = update_value("custom_urls", request.items)
    return {"urls": config["custom_urls"]}


# Alert Score
@router.post("/alert-score")
def update_alert_score(request: UpdateScoreRequest):
    if not 0 <= request.value <= 100:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 100")
    config = update_value("alert_min_score", request.value)
    return {"alert_min_score": config["alert_min_score"]}


# Sender Profile
@router.post("/sender-name")
def update_sender_name(request: UpdateValueRequest):
    config = update_value("sender_name", request.value)
    return {"sender_name": config["sender_name"]}


@router.post("/sender-services")
def update_sender_services(request: UpdateValueRequest):
    config = update_value("sender_services", request.value)
    return {"sender_services": config["sender_services"]}


@router.post("/suggest")
def get_ai_suggestions(request: SuggestRequest):
    """
    Uses AI to suggest subreddits or keywords for a given category.
    """
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

    prompts = {
    "subreddits": f"""
You are helping a freelancer find clients on Reddit.
The freelancer offers this service: {request.category}

Suggest 8 to 10 subreddit names where CLIENTS (business owners, entrepreneurs, small businesses, startups) would post when they need to HIRE someone for this service.
Focus on communities where people POST JOBS or ASK FOR HELP, not communities where professionals hang out.
For example for "video editing": entrepreneur, smallbusiness, startups, forhire, hiring - NOT videoediting or filmmakers.
Only return subreddit names, no r/ prefix, no explanations.
Return as a JSON array of strings only. Example: ["forhire", "entrepreneur", "smallbusiness"]
""",

    "include_keywords": f"""
You are building a keyword filter for a freelance lead generation system.
The service being offered is: {request.category}

Suggest 12 to 15 keywords and short phrases that a CLIENT (someone who wants to HIRE a freelancer) would write in their post when looking for this service.
Focus on:
- Phrases showing they want to hire: "need someone to", "looking for", "hire a", "need help with"
- What the CLIENT wants done, not the freelancer's skills
- Budget or payment signals: "budget", "paid", "rate", "quote"
- Their problem description, not technical jargon

For example for "video editing": "need video editor", "edit my videos", "looking for editor", "video editing help", "need someone to edit"
NOT: "premiere pro", "after effects", "color grading" - those are skills not client signals.

Return as a JSON array of strings only. Example: ["need video editor", "edit my videos", "looking for editor"]
""",

    "blacklist_keywords": f"""
You are building a blacklist filter for a freelance lead generation system focused on: {request.category}

Suggest 10 keywords that would indicate a post should be SKIPPED because:
- The post is from someone OFFERING the service (not buying it)
- The post is unpaid or irrelevant
- The post is about a completely different service category

For example for "video editing" blacklist: "for hire", "offering", "available for", "I edit videos", "my portfolio", "unpaid", "volunteer"
Focus on words that appear in posts FROM freelancers selling services, not FROM clients buying them.

Return as a JSON array of strings only. Example: ["for hire", "offering my services", "available for projects"]
""",
}

    prompt = prompts.get(request.type)
    if not prompt:
        raise HTTPException(status_code=400, detail="Invalid suggestion type")

    for model in OUTREACH_MODELS:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://leadgensystem.local",
                "X-Title": "LeadGenSystem",
            }
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
                "temperature": 0.4,
            }
            response = http_requests.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=20,
            )
            if response.status_code == 429:
                continue
            if response.status_code != 200:
                continue

            raw = response.json()["choices"][0]["message"]["content"].strip()
            raw = raw.replace("```json", "").replace("```", "").strip()

            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start != -1 and end > start:
                import json
                suggestions = json.loads(raw[start:end])
                return {"suggestions": suggestions, "model": model}

        except Exception:
            continue

    raise HTTPException(status_code=500, detail="All models failed to generate suggestions")
