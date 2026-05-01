import requests
import re
from datetime import datetime
from bs4 import BeautifulSoup

CITIES = [
    "newyork", "losangeles", "chicago",
    "seattle", "boston", "austin",
]

HIRING_KEYWORDS = [
    "python", "automation", "scraping", "ai", "bot", "script",
    "api", "backend", "chatbot", "data", "developer", "programmer",
    "web scraping", "machine learning", "flask", "django",
]


IRRELEVANT_KEYWORDS = [
    "$0", "unpaid", "volunteer", "no pay", "training data",
    "data labeling", "part-time unpaid", "internship",
]

def passes_keyword_filter(text: str) -> bool:
    text_lower = text.lower()
    if any(kw in text_lower for kw in IRRELEVANT_KEYWORDS):
        return False
    return any(kw in text_lower for kw in HIRING_KEYWORDS)


def extract_email(text: str) -> str | None:
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    matches = re.findall(pattern, text)
    return matches[0] if matches else None


def get_post_details(url: str, headers: dict) -> dict:
    """Fetches individual post page to extract email and full body."""
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return {"body": "", "email": None}

        soup = BeautifulSoup(response.text, "html.parser")

        body_tag = soup.find("section", id="postingbody")
        body = body_tag.get_text(strip=True) if body_tag else ""
        email = extract_email(body)

        # Also check reply button area for obfuscated emails
        reply_section = soup.find("div", class_="reply-button-container")
        if reply_section:
            reply_text = reply_section.get_text()
            if not email:
                email = extract_email(reply_text)

        return {"body": body[:500], "email": email}

    except Exception:
        return {"body": "", "email": None}


def collect_craigslist_leads() -> list[dict]:
    leads = []
    headers = {"User-Agent": "Mozilla/5.0"}

    for city in CITIES:
        try:
            url = f"https://{city}.craigslist.org/search/cpg"
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code != 200:
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            posts = soup.find_all("li", class_="cl-static-search-result")

            for post in posts[:10]:
                title_tag = post.find("a")
                if not title_tag:
                    continue

                title = title_tag.get_text(strip=True)
                link = title_tag.get("href", "")

                if not passes_keyword_filter(title):
                    continue

                # Fetch individual post for email and body
                details = get_post_details(link, headers)

                leads.append({
                    "source": "craigslist",
                    "title": title,
                    "body": details["body"],
                    "url": link,
                    "author": details["email"] or "unknown",
                    "contact_email": details["email"],
                    "subreddit": city,
                    "posted_at": datetime.utcnow(),
                })

        except Exception as e:
            print(f"[Craigslist] Error for {city}: {e}")
            continue

    print(f"[Craigslist] Total leads collected: {len(leads)}")
    return leads