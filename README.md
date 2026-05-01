# LeadGen System
### AI-Powered Freelance Lead Generation System

A full-stack system that automatically collects, classifies, scores, and manages freelance leads from Reddit, Hacker News, Craigslist, and GitHub. Built with FastAPI, React, SQLite, and OpenRouter AI.

---

## What This System Does

```
Collects leads from multiple public sources every 6 hours
Filters irrelevant posts using keyword pre-filtering
Classifies each lead using AI (is this person hiring?)
Scores leads 0-100 based on intent, budget, urgency, recency
Saves to SQLite database with duplicate detection
Sends instant Telegram alerts for high-scoring leads
Generates personalized outreach messages using AI
Displays everything in a React dashboard
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy |
| Database | SQLite (leads.db) |
| AI Classification | OpenRouter API (5 free models, round-robin) |
| Outreach Generation | OpenRouter API (LLaMA 3.3 70B) |
| Scheduler | APScheduler (runs every 6 hours) |
| Notifications | Telegram Bot API |
| Frontend | React 18, Vite, TailwindCSS v3 |
| HTTP Client | Axios |
| Charts | Recharts |

---

## Data Sources

| Source | Method | Contact Method |
|---|---|---|
| Reddit (r/forhire, r/slavelabour, etc.) | Public JSON API | DM author directly |
| Hacker News | Algolia public API | Email in post |
| Craigslist | HTML scraping | Email extracted from post |
| GitHub Issues | GitHub public API | DM or email on profile |

---

## Project Structure

```
lead-gen-system/
├── backend/
│   ├── collectors/
│   │   ├── reddit_collector.py       # Reddit public JSON collector
│   │   ├── hn_collector.py           # Hacker News Algolia collector
│   │   ├── craigslist_collector.py   # Craigslist scraper + email extractor
│   │   └── github_collector.py       # GitHub issues API collector
│   ├── pipeline/
│   │   ├── filter.py                 # Keyword pre-filter + orchestrator
│   │   ├── classifier.py             # OpenRouter AI classifier
│   │   └── scorer.py                 # Rule-based lead scoring (0-100)
│   ├── routers/
│   │   ├── leads.py                  # Lead CRUD endpoints
│   │   └── outreach.py               # Outreach generation endpoints
│   ├── services/
│   │   ├── lead_service.py           # Database operations
│   │   ├── outreach.py               # AI message generator
│   │   └── telegram_bot.py           # Telegram notifications
│   ├── main.py                       # FastAPI app entry point
│   ├── database.py                   # SQLite connection setup
│   ├── models.py                     # SQLAlchemy Lead model
│   ├── scheduler.py                  # APScheduler jobs
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── client.js             # Axios base config
│       │   └── leads.js              # API call functions
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── StatCard.jsx
│       │   └── Badge.jsx
│       └── pages/
│           ├── Dashboard.jsx         # Stats, chart, recent leads
│           ├── Leads.jsx             # Filterable leads table
│           ├── Outreach.jsx          # Message generator per lead
│           └── Settings.jsx          # System controls
├── .gitignore
└── README.md
```

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/lead-gen-system.git
cd lead-gen-system
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file inside the `backend/` folder. Never commit this file.

```env
# OpenRouter (free AI models for classification and outreach)
OPENROUTER_API_KEY=your_openrouter_key_here

# Gemini (optional fallback)
GEMINI_API_KEY=your_gemini_key_here

# Telegram Bot (get from @BotFather on Telegram)
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Reddit (optional, not required since we use public JSON)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=LeadGenBot/1.0 by YourRedditUsername
```

### 4. Run the Backend

```bash
cd backend
uvicorn main:app --reload
```

API runs at: `http://127.0.0.1:8000`
API docs at: `http://127.0.0.1:8000/docs`

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at: `http://localhost:5173`

---

## How to Get API Keys

| Key | Where to Get |
|---|---|
| OpenRouter | openrouter.ai/keys (free, no card needed) |
| Gemini | aistudio.google.com (free tier) |
| Telegram Bot Token | Message @BotFather on Telegram, send /newbot |
| Telegram Chat ID | Message @userinfobot on Telegram |

---

## Lead Scoring Formula

```
Intent label = hiring          +30 points
Budget mentioned               +25 points
Urgency = high                 +20 points
Posted within 6 hours          +15 points
Urgency = medium               +10 points
Posted within 24 hours         +10 points
Source = remoteok               +8 points
Source = hackernews             +6 points
Source = reddit                 +4 points
Specific service match          +2 points

Score = 0 if not relevant or not_hiring intent
Max score = 100
```

---

## API Endpoints

```
GET    /leads/                    List leads with filters
GET    /leads/stats               Dashboard statistics
GET    /leads/{id}                Single lead detail
PATCH  /leads/{id}/status         Update lead status
POST   /leads/notify/daily        Trigger Telegram summary
POST   /outreach/{id}/generate    Generate outreach message
GET    /outreach/{id}/message     Get saved message
PATCH  /outreach/{id}/mark-sent   Mark lead as contacted
POST   /run-pipeline              Manually trigger full pipeline
```

---

## Pipeline Schedule

```
00:00  Full pipeline run
06:00  Full pipeline run
08:00  Telegram morning summary (top leads)
12:00  Full pipeline run
18:00  Full pipeline run
```

Instant Telegram alert fires whenever a lead scores 70 or above.

---

## AI Models Used (All Free via OpenRouter)

```
meta-llama/llama-3.3-70b-instruct:free   Primary classifier
nvidia/nemotron-3-super-120b-a12b:free   Fallback 1
openai/gpt-oss-120b:free                 Fallback 2
google/gemma-4-31b-it:free               Fallback 3
qwen/qwen3-next-80b-a3b-instruct:free    Fallback 4
```

Models rotate automatically. If one hits rate limits the next one takes over.

---

## Workflow for Getting Clients

```
1. Run pipeline (auto every 6 hours or manual from dashboard)
2. Check Leads page, filter by intent = hiring, sort by score
3. Click message icon on a high-scoring lead
4. Review the AI-generated outreach message
5. Edit if needed to add personal touches
6. Copy message and send it manually on the platform
7. Click Mark as Sent to update lead status
8. Follow up if no reply in 48 hours
```

---

## Roadmap

```
[DONE]  Reddit, HN, Craigslist, GitHub collectors
[DONE]  AI classifier with multi-model fallback
[DONE]  Rule-based lead scoring
[DONE]  SQLite storage with duplicate detection
[DONE]  Telegram notifications + instant alerts
[DONE]  AI outreach message generator
[DONE]  React dashboard with all pages
[TODO]  Google Sheets sync
[TODO]  Manual URL input on dashboard
[TODO]  Configurable services from Settings UI
[TODO]  Lead aging alerts
[TODO]  CSV export
[TODO]  Notes field per lead
[TODO]  Response tracking
[TODO]  Multi-user support (SaaS version)
```

---

## Important Notes

The `.env` file is gitignored and must never be committed. The `leads.db` SQLite database is also gitignored since it contains your real lead data. Anyone cloning this repo needs to create their own `.env` file with their own API keys.

---

## Author

Built by Hasnain as a freelance client acquisition tool while transitioning toward AI engineering.