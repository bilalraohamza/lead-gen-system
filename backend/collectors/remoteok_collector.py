import requests
from datetime import datetime

HIRING_KEYWORDS = [
    "python", "automation", "scraping", "ai", "machine learning",
    "data", "backend", "api", "bot", "script",
]


def passes_keyword_filter(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in HIRING_KEYWORDS)


def collect_remoteok_leads() -> list[dict]:
    """
    Remote OK provides a completely free public JSON API.
    No key, no approval, no registration required.
    """
    leads = []

    try:
        url = "https://remoteok.com/api"
        headers = {"User-Agent": "LeadGenBot/1.0"}
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            print(f"[RemoteOK] HTTP {response.status_code}")
            return leads

        jobs = response.json()

        for job in jobs:
            if not isinstance(job, dict):
                continue

            title = job.get("position", "")
            body = job.get("description", "")
            full_text = f"{title} {body}"

            if not passes_keyword_filter(full_text):
                continue

            leads.append({
                "source": "remoteok",
                "title": title,
                "body": body[:1000],
                "url": job.get("url", ""),
                "author": job.get("company", "unknown"),
                "subreddit": None,
                "posted_at": datetime.utcnow(),
            })

        print(f"[RemoteOK] Total leads collected: {len(leads)}")

    except Exception as e:
        print(f"[RemoteOK] Error: {e}")

    return leads