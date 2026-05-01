import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

DEFAULT_CONFIG = {
    "service_categories": [
        "Python automation",
        "AI automation",
        "Web scraping",
        "API integration",
        "Backend development",
        "Chatbot development",
        "Browser automation",
    ],
    "target_subreddits": [
        "forhire",
        "slavelabour",
        "entrepreneur",
        "smallbusiness",
        "startups",
        "SaaS",
        "webdev",
        "artificial",
        "MachineLearning",
        "freelance",
        "WorkOnline",
    ],
    "include_keywords": [
        "python", "automation", "automate", "scraping", "scraper",
        "ai", "chatbot", "bot", "api", "backend", "developer",
        "data collection", "script", "playwright", "selenium",
        "machine learning", "llm", "openai", "langchain", "fastapi",
        "flask", "django", "web scraping", "data pipeline",
    ],
    "blacklist_keywords": [
        "video editor", "graphic design", "photoshop",
        "tiktok", "instagram", "ugc", "content writer",
        "copywriter", "translator", "logo design",
        "photo editing", "music", "voiceover",
        "$0", "unpaid", "volunteer", "data labeling",
    ],
    "custom_urls": [],
    "alert_min_score": 70,
    "sender_name": "Hasnain",
    "sender_services": "Python automation, AI automation, web scraping, API integrations, chatbot development",
}


def load_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def save_config(config: dict) -> None:
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def get_value(key: str):
    return load_config().get(key, DEFAULT_CONFIG.get(key))


def update_value(key: str, value) -> dict:
    config = load_config()
    config[key] = value
    save_config(config)
    return config