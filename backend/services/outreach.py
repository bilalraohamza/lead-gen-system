import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Multiple models with fallback, smarter models preferred for outreach quality
OUTREACH_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]


def generate_outreach_message(lead: dict, sender_name: str = None) -> str:
    from config_manager import get_value

    if sender_name is None:
        sender_name = get_value("sender_name") or "Hasnain"
    sender_services = get_value("sender_services") or "Python automation, AI automation, web scraping"

    source_context = {
        "reddit": "Reddit post",
        "hackernews": "Hacker News thread",
        "craigslist": "Craigslist post",
        "github": "GitHub issue",
        "twitter": "Twitter post",
    }.get(lead.get("source", ""), "online post")

    prompt = f"""
You are a freelance business development expert writing a cold outreach message.

Sender name: {sender_name}
Sender offers: {sender_services}

You are writing to someone who posted this online:
Source: {source_context}
Title: {lead.get("title", "")}
Their post: {lead.get("body", "")[:500]}
Budget they mentioned: {lead.get("budget_text") or "not mentioned"}
Service they need: {lead.get("specific_service") or "programming help"}

Write a short outreach message following these rules strictly:
1. Maximum 120 words total
2. First sentence must reference something SPECIFIC from their post, not a generic opener
3. Second part explains briefly what {sender_name} can do for their exact problem
4. End with one simple question that invites a reply, not a call to action like "let's hop on a call"
5. No subject line
6. No bullet points
7. No em dashes
8. Sound like a real person, not a template
9. Never say "I came across your post" or "I noticed you" or "I hope this finds you well"
10. Never mention AI wrote this
11. Match the tone of their post. If they wrote casually, write casually. If formal, be professional.

Write only the message body. Nothing else.
"""

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
                "temperature": 0.7,
            }

            response = requests.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=30,
            )

            if response.status_code == 429:
                print(f"[Outreach] {model} rate limited, trying next...")
                continue

            if response.status_code != 200:
                print(f"[Outreach] {model} HTTP {response.status_code}, trying next...")
                continue

            message = response.json()["choices"][0]["message"]["content"].strip()
            print(f"[Outreach] OK ({model.split('/')[1].split(':')[0]})")
            return message

        except Exception as e:
            print(f"[Outreach] {model} error: {e}, trying next...")
            continue

    return "Error: All models failed to generate message. Try again in a few minutes."
