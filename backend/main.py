from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import leads, outreach, settings
from scheduler import start_scheduler
from datetime import datetime
import threading

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lead Gen System", version="1.0.0")

pipeline_status = {
    "running": False,
    "started_at": None,
    "last_completed": None,
    "leads_processed": 0,
}
pipeline_status_lock = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(outreach.router)
app.include_router(settings.router)


@app.on_event("startup")
def startup_event():
    start_scheduler()


@app.get("/")
def root():
    return {"status": "Lead Gen System is running"}


@app.get("/pipeline/status")
def get_pipeline_status():
    with pipeline_status_lock:
        return pipeline_status.copy()


@app.post("/run-pipeline")
def trigger_pipeline_manually():
    from scheduler import run_pipeline

    with pipeline_status_lock:
        if pipeline_status["running"]:
            return {"message": "Pipeline already running"}

        pipeline_status["running"] = True
        pipeline_status["started_at"] = datetime.utcnow().isoformat()
        pipeline_status["leads_processed"] = 0

    def run_with_status():
        try:
            leads_processed = run_pipeline() or 0
            with pipeline_status_lock:
                pipeline_status["leads_processed"] = leads_processed
        finally:
            with pipeline_status_lock:
                pipeline_status["running"] = False
                pipeline_status["last_completed"] = datetime.utcnow().isoformat()

    thread = threading.Thread(target=run_with_status)
    thread.daemon = True
    thread.start()
    return {"message": "Pipeline started in background"}
