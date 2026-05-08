# Lead Gen System

An automated freelance lead generation system that scrapes multiple platforms every 6 hours, runs each post through an AI classifier using free OpenRouter models, scores them with a rule-based engine, and pushes high-intent leads to your Telegram before you even open the dashboard.

> **Status:** Active development. Currently collects from Reddit, Hacker News, Craigslist, GitHub, and RemoteOK. Facebook scraper is scaffolded. More platforms planned.

---

## How It Works

The pipeline runs automatically on a schedule (00:00, 06:00, 12:00, 18:00):

```
Collectors → Pre-filter → AI Classifier → Scorer → Database → Telegram Alert
```

**Step 1 — Collection:** Pulls posts from all active platforms. A single run typically collects around 120 raw leads across sources.

**Step 2 — Pre-filter:** Fast keyword blacklist/whitelist check before any AI call. Irrelevant posts (graphic design, volunteer work, spam phrases) are dropped immediately. No tokens wasted.

**Step 3 — AI Classification:** Each surviving post is sent to OpenRouter with a structured JSON prompt. The classifier determines intent (`hiring`, `maybe`, `not_hiring`), whether a budget is mentioned, urgency level, and the closest matching service. Uses 5 parallel workers.

**Step 4 — Scoring:** A rule-based formula assigns a score from 0 to 100. Leads scoring 0 are dropped from the database entirely.

**Step 5 — Save and Alert:** Qualified leads are saved to SQLite in real time as they finish classifying. Any lead scoring 70 or above triggers an instant Telegram alert. A morning digest of the top 10 leads fires every day at 8 AM.

**Result:** From ~120 raw collected posts, typically 20 to 25 qualified leads survive with a score above zero.

---

## AI Models

The classifier and outreach generator both use [OpenRouter](https://openrouter.ai/) free tier models with automatic fallback rotation. If a model returns a 429 rate limit, it is blacklisted for 60 seconds and the next model in the list is tried.

**Classifier model priority:**

| Priority | Model | Notes |
|----------|-------|-------|
| 1 | `openai/gpt-oss-120b:free` | Most reliable, rarely rate-limited |
| 2 | `nvidia/nemotron-3-super-120b-a12b:free` | Solid fallback |
| 3 | `google/gemma-4-31b-it:free` | Fast and stable |
| 4 | `qwen/qwen3-next-80b-a3b-instruct:free` | Good quality |
| 5 | `meta-llama/llama-3.3-70b-instruct:free` | Last resort |

**Outreach generator** uses the same pool in a different priority order (Llama first for natural tone).

All models are called at `temperature=0.1` for classification (consistent structured output) and `temperature=0.7` for outreach (natural variation).

---

## Scoring Formula

| Factor | Points |
|--------|--------|
| Not relevant to any service | 0 (immediate drop) |
| Intent = `hiring` | +30 |
| Intent = `maybe` | +10 |
| Intent = `not_hiring` | 0 (immediate drop) |
| Budget mentioned in post | +25 |
| Urgency = high | +20 |
| Urgency = medium | +10 |
| Posted within 6 hours | +15 |
| Posted within 24 hours | +10 |
| Posted within 48 hours | +5 |
| Source = RemoteOK | +8 |
| Source = Hacker News | +6 |
| Source = Reddit | +4 |
| Specific service matched | +2 |
| **Maximum** | **100** |

Telegram instant alert threshold: **70+**

---

## Data Sources

| Platform | Method | Frequency | Notes |
|----------|--------|-----------|-------|
| Reddit | Public JSON API | Every run | Targets 11 subreddits (forhire, entrepreneur, SaaS, webdev, etc.) |
| Hacker News | Algolia search API | Every run | 7 hiring-intent queries |
| Craigslist | HTML scraping (BeautifulSoup) | Every run | 6 US cities, computer gigs section |
| GitHub | Issues search API | Every run | 5 queries, 7-day max age |
| RemoteOK | Public JSON API | Every run | No key required |
| Facebook | HTML scraping | Scaffolded | Limited by login wall, planned improvement |

---

## Tech Stack

**Backend**

| Component | Technology |
|-----------|------------|
| API Framework | FastAPI |
| Database | SQLite via SQLAlchemy |
| Scheduler | APScheduler (cron triggers) |
| AI Integration | OpenRouter API (HTTP via `requests`) |
| Scraping | BeautifulSoup4, `requests` |
| Notifications | python-telegram-bot |
| Config | JSON file via config_manager |

**Frontend**

| Component | Technology |
|-----------|------------|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| HTTP Client | Axios |
| Pages | Dashboard, Leads, Outreach, Settings |

---

## Project Structure

```
lead-gen-system/
├── backend/
│   ├── main.py                      # FastAPI app, CORS, pipeline trigger endpoint
│   ├── scheduler.py                 # APScheduler jobs (pipeline + morning summary)
│   ├── database.py                  # SQLAlchemy engine and session
│   ├── models.py                    # Lead model (SQLAlchemy ORM)
│   ├── config_manager.py            # JSON config read/write with defaults
│   ├── requirements.txt
│   ├── collectors/
│   │   ├── reddit_collector.py      # Reddit public JSON API
│   │   ├── hn_collector.py          # Hacker News via Algolia API
│   │   ├── craigslist_collector.py  # HTML scraping, email extraction
│   │   ├── github_collector.py      # GitHub Issues search API
│   │   ├── remoteok_collector.py    # RemoteOK public JSON API
│   │   └── facebook_collector.py    # Scaffolded, login-walled
│   ├── pipeline/
│   │   ├── classifier.py            # OpenRouter AI classifier, model rotation
│   │   ├── filter.py                # Pre-filter + parallel classification
│   │   └── scorer.py                # Rule-based scoring formula (0-100)
│   ├── routers/
│   │   ├── leads.py                 # GET/filter/update lead endpoints
│   │   ├── outreach.py              # Outreach message generation endpoint
│   │   └── settings.py              # Config read/write endpoints
│   └── services/
│       ├── lead_service.py          # Lead CRUD operations
│       ├── outreach.py              # AI outreach message generator
│       ├── telegram_bot.py          # Instant alerts + daily digest
│       └── sheets_sync.py           # Google Sheets sync (planned)
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx        # Pipeline status, stats overview
        │   ├── Leads.jsx            # Filterable lead table
        │   ├── Outreach.jsx         # Generate and copy outreach messages
        │   └── Settings.jsx         # Edit service categories, keywords, config
        ├── components/
        │   ├── LeadRow.jsx
        │   ├── StatCard.jsx
        │   ├── Badge.jsx
        │   └── Sidebar.jsx
        └── api/
            ├── client.js
            └── leads.js
```

---

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- An [OpenRouter](https://openrouter.ai/) account (free tier is sufficient)
- A Telegram bot token and chat ID (from [@BotFather](https://t.me/botfather))

---

## Setup

**1. Clone the repository**

```bash
git clone https://github.com/bilalraohamza/lead-gen-system.git
cd lead-gen-system
```

**2. Backend setup**

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

**3. Frontend setup**

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:8000`.

---

## Configuration

All settings are managed through the Settings page in the dashboard or directly in `backend/config.json`. Key options:

| Setting | Description | Default |
|---------|-------------|---------|
| `service_categories` | What services you offer (used in AI prompt) | Python automation, AI automation, web scraping, etc. |
| `target_subreddits` | Which subreddits to scrape | forhire, entrepreneur, SaaS, webdev, etc. |
| `include_keywords` | Keywords required in strict pre-filter mode | python, automation, ai, bot, etc. |
| `blacklist_keywords` | Keywords that instantly discard a post | graphic design, video editor, volunteer, etc. |
| `strict_prefilter` | Require at least one include keyword before AI call | `false` |
| `alert_min_score` | Score threshold for instant Telegram alert | `70` |
| `sender_name` | Your name used in outreach message generation | Hasnain |
| `sender_services` | Your services used in outreach prompt | Python automation, AI automation, etc. |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/pipeline/status` | Current pipeline run status |
| POST | `/run-pipeline` | Trigger a pipeline run manually |
| GET | `/leads` | List leads with optional filters |
| GET | `/leads/{id}` | Single lead detail |
| PATCH | `/leads/{id}/status` | Update lead status |
| POST | `/outreach/generate` | Generate outreach message for a lead |
| GET | `/settings` | Read current config |
| PUT | `/settings` | Update config |

---

## Telegram Alerts

Two types of Telegram messages are sent:

**Instant alert** (triggered immediately when a lead scores 70+):
```
🚨 HIGH INTENT LEAD DETECTED

🟢 Hiring someone to scrape product data from Amazon
Score: 82/100 | Source: reddit
Service: Web scraping
Budget: $200-500
View Post
```

**Morning digest** (daily at 8 AM, top 10 leads):
```
📊 Daily Lead Summary
Date: 2025-05-08 08:00
Top 5 leads of the day
──────────────────────────────
Lead 1/5

🟢 Need Python developer for automation project...
```

---

## Planned

- [ ] LinkedIn collector
- [ ] Twitter/X collector
- [ ] Upwork RSS feed collector
- [ ] Improved Facebook scraper (with session handling)
- [ ] Google Sheets sync for exported leads
- [ ] Per-platform enable/disable toggles in Settings
- [ ] Lead deduplication across runs
- [ ] Outreach message history and tracking

---

## Author

**Rao Hamza Bilal**

---

## License

This project is currently unlicensed. All rights reserved by the author.
