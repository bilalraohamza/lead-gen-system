from pipeline.classifier import classify_lead
from pipeline.scorer import score_lead
from services.telegram_bot import send_instant_alert


def passes_relevance_prefilter(lead: dict) -> bool:
    text = f"{lead['title']} {lead.get('body', '')}".lower()

    IRRELEVANT_KEYWORDS = [
        "video editor", "graphic design", "photoshop", "illustrator",
        "tiktok", "instagram", "social media", "ugc", "content writer",
        "copywriter", "translator", "accountant", "logo design",
        "wordpress theme", "photo editing", "music", "voiceover",
        "$0", "unpaid", "volunteer", "data labeling",
    ]

    RELEVANCE_KEYWORDS = [
        "python", "automation", "automate", "scraping", "scraper",
        "ai", "chatbot", "bot", "api", "backend", "developer",
        "data collection", "script", "playwright", "selenium",
        "machine learning", "llm", "openai", "langchain", "fastapi",
        "flask", "django", "web scraping", "data pipeline",
    ]

    if any(kw in text for kw in IRRELEVANT_KEYWORDS):
        return False
    return any(kw in text for kw in RELEVANCE_KEYWORDS)


def process_leads(raw_leads: list[dict]) -> list[dict]:
    prefiltered = [l for l in raw_leads if passes_relevance_prefilter(l)]

    print(f"[Filter] {len(raw_leads)} raw -> {len(prefiltered)} after pre-filter")
    print(f"[Filter] Sending {len(prefiltered)} leads to classifier...\n")

    processed = []

    for i, lead in enumerate(prefiltered):
        print(f"[Filter] {i+1}/{len(prefiltered)}: {lead['title'][:60]}...")

        classification = classify_lead(lead["title"], lead.get("body", ""))
        score = score_lead(lead, classification)

        if score == 0.0:
            continue

        lead["score"] = score
        lead["intent_label"] = classification.get("intent_label", "maybe")
        lead["budget_mentioned"] = bool(classification.get("budget_text"))
        lead["budget_text"] = classification.get("budget_text")
        lead["classification_reason"] = classification.get("reason")
        lead["specific_service"] = classification.get("specific_service")

        processed.append(lead)

        # Instant Telegram alert for high quality leads
        if score >= 70:
            print(f"[Filter] High score lead detected ({score}), sending Telegram alert...")
            send_instant_alert(lead)

    processed.sort(key=lambda x: x["score"], reverse=True)
    print(f"\n[Filter] Done. {len(processed)} relevant leads from {len(prefiltered)} pre-filtered.")
    return processed
