import os
import json
import time
import requests
from dotenv import load_dotenv
from itertools import cycle

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Change FREE_MODELS to priority order (most reliable first)
FREE_MODELS = [
    "openai/gpt-oss-120b:free",                  # most reliable, rarely limited
    "nvidia/nemotron-3-super-120b-a12b:free",     # solid fallback
    "google/gemma-4-31b-it:free",                 # fast and stable
    "qwen/qwen3-next-80b-a3b-instruct:free",      # good quality
    "meta-llama/llama-3.3-70b-instruct:free",     # last resort, always limited
]

# Tracks models that are rate limited during current run
_rate_limited_models = set()
_rate_limit_reset_time = {}


def _is_available(model: str) -> bool:
    if model not in _rate_limited_models:
        return True
    reset_time = _rate_limit_reset_time.get(model, 0)
    if time.time() > reset_time:
        _rate_limited_models.discard(model)
        return True
    return False


def _mark_rate_limited(model: str):
    _rate_limited_models.add(model)
    _rate_limit_reset_time[model] = time.time() + 60  # skip for 60 seconds

# Now this works because FREE_MODELS already exists
model_cycle = cycle(FREE_MODELS)

def get_services_context() -> str:
    from config_manager import get_value
    categories = get_value("service_categories")
    return "\n".join(f"- {c}" for c in categories)

DEFAULT_RESULT = {
    "intent_label": "maybe",
    "is_relevant": False,
    "reason": "Classification failed",
    "budget_text": None,
    "urgency": "low",
    "specific_service": None,
}


def call_openrouter(prompt: str, model: str) -> str:
    """
    Makes a single API call to OpenRouter.
    Returns raw text response.
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leadgensystem.local",
        "X-Title": "LeadGenSystem",
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "max_tokens": 300,
        "temperature": 0.1,  # low temperature = consistent structured output
    }

    response = requests.post(
        OPENROUTER_URL,
        headers=headers,
        json=payload,
        timeout=10,
    )

    if response.status_code == 429:
        raise Exception("429 Rate limited")

    if response.status_code != 200:
        raise Exception(f"HTTP {response.status_code}: {response.text[:200]}")

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def classify_lead(title: str, body: str) -> dict:
    services = get_services_context()

    prompt = f"""
You are a lead qualification expert for a freelance services marketplace.

Available services:
{services}

Analyze this post and classify the poster's intent.

Post Title: {title}
Post Body: {body[:600]}

Think step by step:
1. Who is writing this post? A client looking to hire, or a freelancer offering services?
2. Is there a specific task or project they want done?
3. Is there any indication they will pay for this work?
4. Does this match any of the available services, even loosely?

Classification rules:
- "hiring": Poster clearly wants to pay someone to do work for them. Budget may or may not be mentioned. Even vague posts like "looking for someone to help with X" count if there is clear intent to hire.
- "maybe": Poster might be looking to hire but the intent is unclear. Could be a question that leads to hiring, or a business problem they need solved.
- "not_hiring": Poster is offering their own services, asking a technical question for self-learning, sharing news/opinions, or the post has no commercial intent at all.

Relevance rule:
- "is_relevant" is true if the post relates to ANY of the listed services, even broadly. A post about "automating my Excel reports" is relevant to Python automation even if it does not say Python.

Return ONLY a valid JSON object. No text before or after it. No markdown.

{{
    "intent_label": "hiring",
    "is_relevant": true,
    "reason": "Single sentence explaining your decision",
    "budget_text": "exact budget string from post or null",
    "urgency": "high",
    "specific_service": "closest matching service from the list or null"
}}
"""

    available = [m for m in FREE_MODELS if _is_available(m)]
    if not available:
        print("[Classifier] All models rate limited, waiting 15s...")
        time.sleep(15)
        available = FREE_MODELS

    for model in available:
        try:
            raw = call_openrouter(prompt, model)
            raw = raw.replace("```json", "").replace("```", "").strip()

            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > start:
                raw = raw[start:end]

            result = json.loads(raw)
            print(f"[Classifier] OK ({model.split('/')[1].split(':')[0]})")
            return result

        except json.JSONDecodeError:
            print(f"[Classifier] JSON parse failed for {model}")
            continue

        except Exception as e:
            error_str = str(e)
            if "429" in error_str:
                print(f"[Classifier] {model} rate limited, blacklisting for 60s...")
                _mark_rate_limited(model)
                continue
            print(f"[Classifier] {model} error: {e}")
            continue

    print("[Classifier] All models failed, returning default")
    return DEFAULT_RESULT