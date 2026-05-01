from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from config_manager import load_config, save_config, update_value

router = APIRouter(prefix="/settings", tags=["settings"])


class UpdateListRequest(BaseModel):
    items: List[str]


class UpdateValueRequest(BaseModel):
    value: str


class UpdateScoreRequest(BaseModel):
    value: int


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