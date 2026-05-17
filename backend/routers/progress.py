import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from services.render_service import poll_job_progress

router = APIRouter()


@router.get("/{job_id}")
async def get_progress(job_id: str):
    """Single poll — returns current job status."""
    try:
        return await poll_job_progress(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.websocket("/ws/{job_id}")
async def progress_websocket(websocket: WebSocket, job_id: str):
    """
    Live WebSocket stream — sends job status every 10 seconds
    until the job is complete or the client disconnects.
    """
    await websocket.accept()
    try:
        while True:
            try:
                job = await poll_job_progress(job_id)
            except ValueError:
                await websocket.send_json({"error": f"Job {job_id} not found"})
                break

            # Strip api_keys
            safe = {**job}
            safe["tasks"] = [
                {k: v for k, v in t.items() if k != "api_key"} for t in job["tasks"]
            ]
            await websocket.send_json(safe)

            if job["status"] in ("complete", "partial"):
                break

            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass
