import requests
from datetime import datetime
from bs4 import BeautifulSoup

# Public groups where founders and business owners ask for developer help
TARGET_GROUPS = [
    "https://www.facebook.com/groups/entrepreneur",
    "https://www.facebook.com/groups/smallbusinessowners",
    "https://www.facebook.com/groups/startupfounders",
]

HIRING_KEYWORDS = [
    "need a developer", "looking for developer", "python developer",
    "need help with", "hire", "automation", "web scraping",
    "need someone to build", "chatbot", "ai tool", "script",
]


def passes_keyword_filter(text: str) -> bool:
    return any(kw in text.lower() for kw in HIRING_KEYWORDS)


def collect_facebook_leads() -> list[dict]:
    """
    Facebook public groups are partially readable without login.
    Results will be limited but worthwhile for high-intent leads.
    """
    leads = []
    headers = {"User-Agent": "Mozilla/5.0"}

    for group_url in TARGET_GROUPS:
        try:
            response = requests.get(group_url, headers=headers, timeout=10)

            if response.status_code != 200:
                print(f"[Facebook] HTTP {response.status_code} for {group_url}")
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            posts = soup.find_all("div", role="article")

            for post in posts[:10]:
                text = post.get_text(strip=True)

                if not passes_keyword_filter(text):
                    continue

                title = text[:100]
                leads.append({
                    "source": "facebook",
                    "title": title,
                    "body": text[:500],
                    "url": group_url,
                    "author": "unknown",
                    "subreddit": None,
                    "posted_at": datetime.utcnow(),
                })

        except Exception as e:
            print(f"[Facebook] Error: {e}")
            continue

    print(f"[Facebook] Total leads collected: {len(leads)}")
    return leads