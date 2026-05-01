import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from services.lead_service import save_leads_bulk, get_leads
from services.telegram_bot import send_daily_summary
from collectors.reddit_collector import collect_reddit_leads
from collectors.hn_collector import collect_hn_leads
from collectors.craigslist_collector import collect_craigslist_leads
from collectors.github_collector import collect_github_leads
from pipeline.filter import process_leads
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_pipeline():
    """
    Full pipeline job. Collects, filters, scores, saves, and notifies.
    This runs automatically every 6 hours.
    """
    logger.info("Pipeline started...")

    raw_leads = []

    try:
        logger.info("Collecting from Reddit...")
        raw_leads += collect_reddit_leads(limit_per_subreddit=25)
    except Exception as e:
        logger.error(f"Reddit collector failed: {e}")

    try:
        logger.info("Collecting from Hacker News...")
        raw_leads += collect_hn_leads()
    except Exception as e:
        logger.error(f"HN collector failed: {e}")

    try:
        logger.info("Collecting from Craigslist...")
        raw_leads += collect_craigslist_leads()
    except Exception as e:
        logger.error(f"Craigslist collector failed: {e}")

    try:
        logger.info("Collecting from GitHub...")
        raw_leads += collect_github_leads()
    except Exception as e:
        logger.error(f"GitHub collector failed: {e}")

    logger.info(f"Total raw leads: {len(raw_leads)}")

    if not raw_leads:
        logger.warning("No raw leads collected. Skipping pipeline.")
        return

    # Filter and score
    processed = process_leads(raw_leads)
    logger.info(f"Processed leads: {len(processed)}")

    # Save to database
    db = SessionLocal()
    try:
        result = save_leads_bulk(db, processed)
        logger.info(f"Saved: {result['saved']} | Skipped duplicates: {result['skipped_duplicates']}")
    finally:
        db.close()

    logger.info("Pipeline complete.")


def send_morning_summary():
    """
    Sends top leads from the last 24 hours to Telegram every morning at 8 AM.
    """
    logger.info("Sending morning summary...")
    db = SessionLocal()
    try:
        leads = get_leads(db, min_score=30, limit=10)
        send_daily_summary(leads)
        logger.info(f"Morning summary sent with {len(leads)} leads.")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()

    # Run full pipeline every 6 hours
    scheduler.add_job(
        run_pipeline,
        trigger=CronTrigger(hour="0,6,12,18", minute=0),
        id="pipeline_job",
        name="Full Lead Pipeline",
        replace_existing=True,
        misfire_grace_time=300,  # if job misses by up to 5 min, still run it
    )

    # Send morning summary every day at 8 AM
    scheduler.add_job(
        send_morning_summary,
        trigger=CronTrigger(hour=8, minute=0),
        id="morning_summary",
        name="Morning Telegram Summary",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started. Pipeline runs at 0:00, 6:00, 12:00, 18:00.")
    logger.info("Morning summary runs at 8:00 AM daily.")
    return scheduler