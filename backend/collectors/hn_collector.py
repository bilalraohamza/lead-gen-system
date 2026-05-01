import requests
from datetime import datetime

HIRING_KEYWORDS = [
    "python", "automation", "scraping", "ai", "machine learning",
    "freelance", "contract", "remote", "developer", "engineer",
    "build", "script", "bot", "data", "api",
]


def passes_keyword_filter(text: str) -> bool:
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in HIRING_KEYWORDS)


def collect_hn_leads() -> list[dict]:
    """
    Pulls from HN 'Freelancer? Seeking Freelancer?' monthly thread
    and 'Ask HN: Who wants to be hired?' thread via Algolia API.
    """
    leads = []
    queries = [
    "seeking freelancer python",
    "who wants to be hired developer",
    "looking for developer remote",
    "need python automation",
    "hire developer contract",
    "build me a bot",
    "need help with scraping",]

    for query in queries:
        try:
            url = "https://hn.algolia.com/api/v1/search"
            params = {
                "query": query,
                "tags": "story",
                "numericFilters": "created_at_i>1700000000",  # recent posts only
                "hitsPerPage": 20,
            }

            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                continue

            hits = response.json().get("hits", [])

            for hit in hits:
                title = hit.get("title", "")
                body = hit.get("story_text") or ""
                full_text = f"{title} {body}"

                if not passes_keyword_filter(full_text):
                    continue

                created_ts = hit.get("created_at_i", 0)
                post_age_hours = (
                    datetime.utcnow() -
                    datetime.utcfromtimestamp(created_ts)
                ).total_seconds() / 3600

                if post_age_hours > 720:
                    continue

                leads.append({
                    "source": "hackernews",
                    "title": title,
                    "body": body[:1000],
                    "url": f"https://news.ycombinator.com/item?id={hit.get('objectID')}",
                    "author": hit.get("author", "unknown"),
                    "subreddit": None,
                    "posted_at": datetime.utcfromtimestamp(created_ts),
                })

            print(f"[HN] Query '{query}': found {len(hits)} hits")

        except Exception as e:
            print(f"[HN] Error: {e}")
            continue

    print(f"[HN] Total leads collected: {len(leads)}")
    return leads