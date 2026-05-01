from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import leads
from routers import outreach
from scheduler import start_scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lead Gen System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(outreach.router)


@app.on_event("startup")
def startup_event():
    start_scheduler()


@app.get("/")
def root():
    return {"status": "Lead Gen System is running"}


@app.post("/run-pipeline")
def trigger_pipeline_manually():
    """
    Manually trigger the full pipeline from the UI or API.
    Useful for testing without waiting for the scheduled time.
    """
    from scheduler import run_pipeline
    run_pipeline()
    return {"message": "Pipeline executed successfully"}
