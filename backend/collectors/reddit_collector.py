import requests
import time
from datetime import datetime

HIRING_KEYWORDS = [
    "hire", "hiring", "need help", "looking for", "need a developer",
    "need someone", "budget", "pay", "paid", "contractor", "freelancer",
    "quote", "rate", "build me", "automate", "scraper", "automation",
    "python script", "ai tool", "chatbot", "web scraping", "data collection",
    "need built", "commission", "$", "usd",
]

HEADERS = {"User-Agent": "LeadGenBot/1.0"}


def passes_keyword_filter(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in HIRING_KEYWORDS)


def collect_reddit_leads(limit_per_subreddit: int = 25) -> list[dict]:
    from config_manager import get_value
    subreddits = get_value("target_subreddits")
    leads = []

    for subreddit_name in subreddits:
        try:
            url = f"https://www.reddit.com/r/{subreddit_name}/new.json?limit={limit_per_subreddit}"
            response = requests.get(url, headers=HEADERS, timeout=10)

            if response.status_code != 200:
                print(f"[Reddit] r/{subreddit_name}: HTTP {response.status_code}, skipping")
                continue

            posts = response.json()["data"]["children"]

            for post in posts:
                data = post["data"]
                title = data["title"]
                body = data.get("selftext", "")
                full_text = f"{title} {body}"

                # CRITICAL FIX: Skip posts from people offering services
                title_lower = title.lower()
                if any(tag in title_lower for tag in [
                    "[for hire]", "(for hire)", "for hire]",
                    "[offer]", "(offer)", "[selling]"
                ]):
                    continue

                # Only keep posts from people looking to hire
                is_hiring_post = any(tag in title_lower for tag in [
                    "[hiring]", "(hiring)", "[hire]", "[task]", "(task)",
                    "looking for", "need a", "need someone", "need help",
                    "want to hire", "seeking", "searching for"
                ])

                # For non-forhire subreddits, rely on keyword filter
                if subreddit_name in ["forhire", "slavelabour"] and not is_hiring_post:
                    continue

                if not passes_keyword_filter(full_text):
                    continue

                post_age_hours = (
                    datetime.utcnow() -
                    datetime.utcfromtimestamp(data["created_utc"])
                ).total_seconds() / 3600

                if post_age_hours > 72:
                    continue

                leads.append({
                    "source": "reddit",
                    "title": title,
                    "body": body[:1000],
                    "url": f"https://reddit.com{data['permalink']}",
                    "author": data.get("author", "unknown"),
                    "subreddit": subreddit_name,
                    "posted_at": datetime.utcfromtimestamp(data["created_utc"]),
                })

            print(f"[Reddit] r/{subreddit_name}: done")
            time.sleep(2)

        except Exception as e:
            print(f"[Reddit] Error on r/{subreddit_name}: {e}")
            continue

    print(f"[Reddit] Total leads collected: {len(leads)}")
    return leads
