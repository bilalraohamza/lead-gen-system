from pipeline.classifier import classify_lead
from pipeline.scorer import score_lead
from services.telegram_bot import send_instant_alert
from config_manager import get_value
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Thread-safe lock for database writes
db_lock = threading.Lock()


def passes_relevance_prefilter(lead: dict) -> bool:
    text = f"{lead['title']} {lead.get('body', '')}".lower()
    blacklist = get_value("blacklist_keywords")

    if any(kw.lower() in text for kw in blacklist):
        return False

    UNIVERSAL_SPAM = [
        "happy cake day", "this is the way", "good bot",
        "[deleted]", "[removed]", "rip my inbox",
    ]
    if any(s in text for s in UNIVERSAL_SPAM):
        return False

    strict_mode = get_value("strict_prefilter")
    include = get_value("include_keywords")

    if strict_mode and include:
        return any(kw.lower() in text for kw in include)
    return True


def classify_and_score(lead: dict) -> dict | None:
    """Classifies and scores a single lead. Returns None if irrelevant."""
    try:
        classification = classify_lead(lead["title"], lead.get("body", ""))
        score = score_lead(lead, classification)

        if score == 0.0:
            return None

        lead["score"]                 = score
        lead["intent_label"]          = classification.get("intent_label", "maybe")
        lead["budget_mentioned"]      = bool(classification.get("budget_text"))
        lead["budget_text"]           = classification.get("budget_text")
        lead["classification_reason"] = classification.get("reason")
        lead["specific_service"]      = classification.get("specific_service")
        return lead

    except Exception as e:
        print(f"[Filter] Error classifying lead: {e}")
        return None


def process_leads(raw_leads: list[dict], db=None) -> list[dict]:
    alert_min_score = get_value("alert_min_score")
    prefiltered = [l for l in raw_leads if passes_relevance_prefilter(l)]

    print(f"[Filter] {len(raw_leads)} raw -> {len(prefiltered)} after pre-filter")
    print(f"[Filter] Classifying {len(prefiltered)} leads in parallel...\n")

    processed = []
    completed = 0

    # Use 5 parallel workers matching our 5 AI models
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_lead = {
            executor.submit(classify_and_score, lead): lead
            for lead in prefiltered
        }

        for future in as_completed(future_to_lead):
            completed += 1
            result = future.result()

            if result is None:
                print(f"[Filter] {completed}/{len(prefiltered)}: Irrelevant, skipped")
                continue

            print(f"[Filter] {completed}/{len(prefiltered)}: Score {result['score']} - {result['title'][:50]}")
            processed.append(result)

            # Save immediately if db provided (thread-safe)
            if db is not None:
                with db_lock:
                    try:
                        from services.lead_service import save_lead
                        save_lead(db, result)
                    except Exception as e:
                        print(f"[Filter] Save error: {e}")

            # Send instant alert for high score leads
            if result["score"] >= alert_min_score:
                send_instant_alert(result)

    processed.sort(key=lambda x: x["score"], reverse=True)
    print(f"\n[Filter] Done. {len(processed)} relevant leads from {len(prefiltered)} pre-filtered.")
    return processed
