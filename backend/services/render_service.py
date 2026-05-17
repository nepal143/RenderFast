import asyncio
import json
import os
import re
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from services.accounts_service import get_active_accounts
from services.kaggle_service import (
    upload_blender_file_as_dataset,
    create_and_run_kernel,
    get_kernel_status,
    download_kernel_output,
)

BACKEND_DIR = Path(__file__).parent.parent
JOBS_FILE = BACKEND_DIR / "data" / "jobs.json"
NOTEBOOK_TEMPLATE = BACKEND_DIR / "kaggle_notebook" / "render_template.ipynb"


def _load_jobs() -> Dict:
    if not JOBS_FILE.exists():
        return {}
    with open(JOBS_FILE, "r") as f:
        return json.load(f)


def _save_jobs(jobs: Dict):
    JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=2)


def get_job(job_id: str) -> Optional[Dict]:
    return _load_jobs().get(job_id)


def list_jobs() -> List[Dict]:
    return list(_load_jobs().values())


def _split_frames(total_frames: int, accounts: List[Dict]) -> List[Dict]:
    """Distribute frames evenly across accounts."""
    n = len(accounts)
    base, remainder = divmod(total_frames, n)
    assignments = []
    start = 1
    for i, acc in enumerate(accounts):
        count = base + (1 if i < remainder else 0)
        end = start + count - 1
        assignments.append({"account": acc, "start_frame": start, "end_frame": end})
        start = end + 1
    return assignments


async def create_render_job(
    blend_file_path: str,
    total_frames: int,
    job_id: Optional[str] = None,
) -> Dict:
    job_id = job_id or str(uuid.uuid4())[:8]
    accounts = get_active_accounts()
    if not accounts:
        raise ValueError("No active Kaggle accounts configured.")

    assignments = _split_frames(total_frames, accounts)
    dataset_slug = f"renderfast-{job_id}"

    # Use the first account to upload the dataset (it's public, all can read it)
    primary = accounts[0]
    dataset_ref = upload_blender_file_as_dataset(
        username=primary["username"],
        api_key=primary["api_key"],
        blender_file_path=blend_file_path,
        dataset_slug=dataset_slug,
    )

    tasks = []
    for idx, assignment in enumerate(assignments):
        acc = assignment["account"]
        kernel_slug = f"renderfast-{job_id}-{idx}"
        env_vars = {
            "BLEND_FILENAME": Path(blend_file_path).name,
            "START_FRAME": str(assignment["start_frame"]),
            "END_FRAME": str(assignment["end_frame"]),
            "JOB_ID": job_id,
        }
        kernel_ref = create_and_run_kernel(
            username=acc["username"],
            api_key=acc["api_key"],
            kernel_slug=kernel_slug,
            notebook_source_path=str(NOTEBOOK_TEMPLATE),
            dataset_ref=dataset_ref,
            env_vars=env_vars,
        )
        tasks.append({
            "account": acc["username"],
            "kernel_ref": kernel_ref,
            "start_frame": assignment["start_frame"],
            "end_frame": assignment["end_frame"],
            "status": "running",
            "api_key": acc["api_key"],
        })

    job = {
        "job_id": job_id,
        "blend_file": Path(blend_file_path).name,
        "total_frames": total_frames,
        "dataset_ref": dataset_ref,
        "tasks": tasks,
        "status": "running",
    }

    jobs = _load_jobs()
    jobs[job_id] = job
    _save_jobs(jobs)
    return job


async def poll_job_progress(job_id: str) -> Dict:
    """Check all kernel statuses and update job record."""
    jobs = _load_jobs()
    job = jobs.get(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    all_done = True
    for task in job["tasks"]:
        if task["status"] in ("complete", "error"):
            continue
        result = get_kernel_status(
            username=task["account"],
            api_key=task["api_key"],
            kernel_ref=task["kernel_ref"],
        )
        task["status"] = result["status"]
        task["failure_message"] = result.get("failure_message")
        if result["status"] not in ("complete", "error"):
            all_done = False

    if all_done:
        job["status"] = "complete" if all(
            t["status"] == "complete" for t in job["tasks"]
        ) else "partial"

    _save_jobs(jobs)
    return job


async def download_job_frames(job_id: str) -> str:
    """Download all frames from completed kernels. Returns output directory."""
    jobs = _load_jobs()
    job = jobs.get(job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")

    out_dir = BACKEND_DIR / "rendered_frames" / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    for task in job["tasks"]:
        if task["status"] == "complete":
            download_kernel_output(
                username=task["account"],
                api_key=task["api_key"],
                kernel_ref=task["kernel_ref"],
                dest_dir=str(out_dir),
            )

    return str(out_dir)
