from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import os
from pathlib import Path

from routers import accounts, jobs, progress, download

app = FastAPI(
    title="RenderFast API",
    description="Distributed Blender rendering across multiple Kaggle instances",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
app.include_router(download.router, prefix="/api/download", tags=["Download"])

# Serve rendered frames as static files
frames_dir = Path(__file__).parent / "rendered_frames"
frames_dir.mkdir(exist_ok=True)
app.mount("/frames", StaticFiles(directory=str(frames_dir)), name="frames")


@app.get("/")
def root():
    return {"message": "RenderFast API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
