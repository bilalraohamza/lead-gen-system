import requests
from datetime import datetime

SEARCH_QUERIES = [
    "looking for developer help wanted paid",
    "hire python developer bounty",
    "need help building automation paid",
    "freelance python opportunity",
    "bounty python script",
]

HIRING_KEYWORDS = [
    "hire", "paid", "bounty", "freelance", "contract",
    "looking for", "need help", "need a developer",
    "willing to pay", "budget", "compensation",
]

IRRELEVANT_KEYWORDS = [
    "unpaid", "volunteer", "open source contribution",
    "good first issue", "help wanted free",
]


def passes_keyword_filter(text: str) -> bool:
    text_lower = text.lower()
    if any(kw in text_lower for kw in IRRELEVANT_KEYWORDS):
        return False
    return any(kw in text_lower for kw in HIRING_KEYWORDS)


def collect_github_leads() -> list[dict]:
    leads = []
    headers = {
        "User-Agent": "LeadGenBot/1.0",
        "Accept": "application/vnd.github.v3+json",
    }

    for query in SEARCH_QUERIES:
        try:
            url = "https://api.github.com/search/issues"
            params = {
                "q": f"{query} is:open",
                "sort": "created",
                "order": "desc",
                "per_page": 10,
            }

            response = requests.get(url, headers=headers, params=params, timeout=10)

            if response.status_code == 403:
                print("[GitHub] Rate limited, skipping")
                break

            if response.status_code != 200:
                print(f"[GitHub] HTTP {response.status_code}")
                continue

            items = response.json().get("items", [])

            for item in items:
                title = item.get("title", "")
                body = item.get("body") or ""
                full_text = f"{title} {body}"

                if not passes_keyword_filter(full_text):
                    continue

                created_at = item.get("created_at", "")
                try:
                    posted_at = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ")
                    age_hours = (datetime.utcnow() - posted_at).total_seconds() / 3600
                    if age_hours > 168:  # 7 days
                        continue
                except Exception:
                    posted_at = datetime.utcnow()

                leads.append({
                    "source": "github",
                    "title": title,
                    "body": body[:500],
                    "url": item.get("html_url", ""),
                    "author": item.get("user", {}).get("login", "unknown"),
                    "subreddit": None,
                    "posted_at": posted_at,
                })

        except Exception as e:
            print(f"[GitHub] Error for query '{query}': {e}")
            continue

    print(f"[GitHub] Total leads collected: {len(leads)}")
    return leads