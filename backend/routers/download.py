import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.render_service import download_job_frames, get_job

router = APIRouter()


@router.post("/{job_id}")
async def trigger_download(job_id: str):
    """Download rendered frames from Kaggle and store locally."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] not in ("complete", "partial"):
        raise HTTPException(status_code=400, detail="Job is not finished yet.")

    out_dir = await download_job_frames(job_id)
    return {"frames_directory": out_dir}


@router.get("/{job_id}/zip")
def download_frames_zip(job_id: str):
    """Bundle all downloaded frames into a zip and serve it."""
    frames_dir = Path(f"rendered_frames/{job_id}")
    if not frames_dir.exists():
        raise HTTPException(status_code=404, detail="Frames not downloaded yet. POST to /api/download/{job_id} first.")

    zip_path = Path(f"rendered_frames/{job_id}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for frame in sorted(frames_dir.iterdir()):
            zf.write(frame, frame.name)

    return FileResponse(
        path=str(zip_path),
        filename=f"renderfast_{job_id}_frames.zip",
        media_type="application/zip",
    )


@router.get("/{job_id}/frames")
def list_frames(job_id: str):
    """List all locally downloaded frame filenames."""
    frames_dir = Path(f"rendered_frames/{job_id}")
    if not frames_dir.exists():
        return {"frames": []}
    frames = sorted([f.name for f in frames_dir.iterdir() if f.is_file()])
    return {"frames": frames, "count": len(frames)}
