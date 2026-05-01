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
You are an expert freelance consultant writing a personalized outreach message.

The sender's name is {sender_name}.
The sender offers these services: {sender_services}

Write a short outreach message for this lead. The message will be sent as a direct message or email.

Lead details:
Title: {lead.get("title", "")}
Description: {lead.get("body", "")[:400]}
Source: {source_context}
Budget mentioned: {lead.get("budget_text") or "Not mentioned"}
Service needed: {lead.get("specific_service") or "Programming help"}

Rules for the message:
- Maximum 150 words
- Sound human, warm, and specific to their problem
- Do not use generic phrases like "I hope this message finds you well"
- Mention one specific detail from their post to show you read it
- Briefly state what you can do for them
- End with a simple call to action like asking if they want to discuss
- Do not include subject line, just the message body
- Do not use bullet points in the message
- Write in first person as {sender_name}
- Sound confident but not salesy
- Do not mention AI wrote this
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
