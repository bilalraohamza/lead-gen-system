import os
import json
import time
import requests
from dotenv import load_dotenv
from itertools import cycle

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Change FREE_MODELS to priority order (fastest and most reliable first)
FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",  # primary, fastest
    "openai/gpt-oss-120b:free",                 # fallback 1
    "google/gemma-4-31b-it:free",               # fallback 2
    "nvidia/nemotron-3-super-120b-a12b:free",   # fallback 3
    "qwen/qwen3-next-80b-a3b-instruct:free",    # fallback 4
]

# Now this works because FREE_MODELS already exists
model_cycle = cycle(FREE_MODELS)

SERVICES_CONTEXT = """
- Python automation (scripts, bots, workflow automation)
- AI automation (ChatGPT integrations, AI agents, LLM tools)
- Web scraping and data collection
- Data processing and analysis scripts
- API integrations
- Backend development (Python, FastAPI, Flask)
- Chatbot development
- Browser automation (Selenium, Playwright)
"""

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
    prompt = f"""
You are a lead qualification assistant for a programming services business.

Our services:
{SERVICES_CONTEXT}

Analyze this post and return a JSON response only.
No extra text, no markdown, no backticks, no explanation outside the JSON.

Post Title: {title}
Post Body: {body[:500]}

Return exactly this JSON structure:
{{
    "intent_label": "hiring" or "not_hiring" or "maybe",
    "is_relevant": true or false,
    "reason": "one sentence explaining your decision",
    "budget_text": "extracted budget string or null if none mentioned",
    "urgency": "high" or "medium" or "low",
    "specific_service": "which of our services this matches or null"
}}

Rules:
- intent_label is "hiring" only if they are clearly looking to pay someone
- is_relevant is true only if it matches one of our services
- If the post is someone offering services, intent_label is "not_hiring"
- Extract budget_text exactly as written in the post
"""

    for model in FREE_MODELS:
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
            print(f"[Classifier] JSON parse failed for {model}, trying next...")
            continue

        except Exception as e:
            error_str = str(e)
            if "429" in error_str:
                print(f"[Classifier] {model} rate limited, switching to next model...")
                continue
            print(f"[Classifier] {model} error: {e}, trying next...")
            continue

    print("[Classifier] All models failed, returning default")
    return DEFAULT_RESULT