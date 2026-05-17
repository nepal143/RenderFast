import os
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from services.render_service import create_render_job, list_jobs, get_job

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.get("/")
def get_jobs():
    return list_jobs()


@router.get("/{job_id}")
def get_job_by_id(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Strip api_keys before returning
    safe = {**job}
    safe["tasks"] = [
        {k: v for k, v in t.items() if k != "api_key"} for t in job["tasks"]
    ]
    return safe


@router.post("/")
async def submit_job(
    blend_file: UploadFile = File(...),
    total_frames: int = Form(...),
):
    if not blend_file.filename.endswith(".blend"):
        raise HTTPException(status_code=400, detail="Only .blend files are supported.")

    # Save uploaded file
    dest = UPLOAD_DIR / blend_file.filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(blend_file.file, f)

    try:
        job = await create_render_job(
            blend_file_path=str(dest),
            total_frames=total_frames,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    safe = {**job}
    safe["tasks"] = [
        {k: v for k, v in t.items() if k != "api_key"} for t in job["tasks"]
    ]
    return safe
