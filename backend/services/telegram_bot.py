import os
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_message(text: str) -> bool:
    """
    Sends a plain text message to your Telegram chat.
    Returns True if successful.
    """
    try:
        response = requests.post(
            f"{TELEGRAM_URL}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "HTML",
            },
            timeout=10,
        )
        return response.status_code == 200

    except Exception as e:
        print(f"[Telegram] Error: {e}")
        return False


def format_lead_message(lead) -> str:
    """
    Formats a single lead into a readable Telegram message.
    Works with both dict and SQLAlchemy model object.
    """
    if isinstance(lead, dict):
        title   = lead.get("title", "No title")
        source  = lead.get("source", "unknown")
        score   = lead.get("score", 0)
        intent  = lead.get("intent_label", "unknown")
        budget  = lead.get("budget_text") or "Not mentioned"
        url     = lead.get("url", "")
        service = lead.get("specific_service") or "General"
    else:
        title   = lead.title
        source  = lead.source
        score   = lead.score
        intent  = lead.intent_label
        budget  = lead.budget_text or "Not mentioned"
        url     = lead.url
        service = lead.specific_service or "General"

    intent_emoji = {
        "hiring": "🟢",
        "maybe": "🟡",
        "not_hiring": "🔴",
    }.get(intent, "⚪")

    return (
        f"{intent_emoji} <b>{title[:80]}</b>\n"
        f"Score: <b>{score}/100</b> | Source: {source}\n"
        f"Service: {service}\n"
        f"Budget: {budget}\n"
        f"<a href='{url}'>View Post</a>"
    )


def send_daily_summary(leads: list) -> bool:
    """
    Sends a daily digest of top leads to Telegram.
    Accepts both list of dicts and list of Lead model objects.
    """
    if not leads:
        message = (
            "📭 <b>Daily Lead Summary</b>\n"
            f"Date: {datetime.now().strftime('%Y-%m-%d')}\n\n"
            "No new leads found today. Check sources manually."
        )
        return send_message(message)

    # Header
    header = (
        f"📊 <b>Daily Lead Summary</b>\n"
        f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        f"Top {min(len(leads), 5)} leads of the day\n"
        f"{'─' * 30}"
    )
    send_message(header)

    # Send top 5 leads as individual messages
    top_leads = leads[:5]
    for i, lead in enumerate(top_leads, 1):
        lead_msg = f"<b>Lead {i}/{len(top_leads)}</b>\n\n"
        lead_msg += format_lead_message(lead)
        send_message(lead_msg)

    # Footer with quick stats
    high_intent = sum(
        1 for l in leads
        if (l.get("intent_label") if isinstance(l, dict) else l.intent_label) == "hiring"
    )

    footer = (
        f"{'─' * 30}\n"
        f"Total leads today: <b>{len(leads)}</b>\n"
        f"High intent (hiring): <b>{high_intent}</b>\n"
        f"Open dashboard to take action."
    )
    send_message(footer)
    return True


def send_instant_alert(lead) -> bool:
    """
    Sends an immediate alert for a high scoring lead.
    Called when a lead scores above 70.
    """
    message = (
        f"🚨 <b>HIGH INTENT LEAD DETECTED</b>\n\n"
        f"{format_lead_message(lead)}\n\n"
        f"Act fast, this lead is fresh!"
    )
    return send_message(message)