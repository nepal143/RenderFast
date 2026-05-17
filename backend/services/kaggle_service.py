import os
import zipfile
import shutil
import tempfile
from pathlib import Path
from typing import List, Dict


def _get_api(username: str, api_key: str):
    """Instantiate a Kaggle API client for a specific account (lazy import)."""
    os.environ["KAGGLE_USERNAME"] = username
    os.environ["KAGGLE_KEY"] = api_key
    # Import AFTER setting env vars so kaggle/__init__.py authenticate() uses them
    from kaggle.api.kaggle_api_extended import KaggleApi  # noqa: PLC0415
    api = KaggleApi()
    api.authenticate()
    return api


def upload_blender_file_as_dataset(
    username: str,
    api_key: str,
    blender_file_path: str,
    dataset_slug: str,
) -> str:
    """
    Upload a .blend file as a public Kaggle dataset.
    Returns the dataset reference string: username/dataset_slug
    """
    api = _get_api(username, api_key)

    # Create a temp folder with the blend file and dataset metadata
    with tempfile.TemporaryDirectory() as tmp_dir:
        blend_dest = os.path.join(tmp_dir, os.path.basename(blender_file_path))
        shutil.copy(blender_file_path, blend_dest)

        metadata = {
            "title": dataset_slug,
            "id": f"{username}/{dataset_slug}",
            "licenses": [{"name": "CC0-1.0"}],
        }
        import json
        meta_path = os.path.join(tmp_dir, "dataset-metadata.json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f)

        api.dataset_create_new(
            folder=tmp_dir,
            public=True,
            quiet=False,
            convert_to_csv=False,
        )

    return f"{username}/{dataset_slug}"


def create_and_run_kernel(
    username: str,
    api_key: str,
    kernel_slug: str,
    notebook_source_path: str,
    dataset_ref: str,
    env_vars: Dict[str, str],
) -> str:
    """
    Push and run a Kaggle kernel (notebook) attached to the blend dataset.
    Returns the kernel reference: username/kernel_slug
    """
    api = _get_api(username, api_key)

    kernel_meta = {
        "id": f"{username}/{kernel_slug}",
        "title": kernel_slug,
        "code_file": os.path.basename(notebook_source_path),
        "language": "python",
        "kernel_type": "notebook",
        "is_private": False,
        "enable_gpu": True,
        "enable_internet": True,
        "dataset_sources": [dataset_ref],
        "kernel_sources": [],
        "competition_sources": [],
        "environment_variables": [
            {"key": k, "value": v} for k, v in env_vars.items()
        ],
    }

    with tempfile.TemporaryDirectory() as tmp_dir:
        import json
        meta_path = os.path.join(tmp_dir, "kernel-metadata.json")
        with open(meta_path, "w") as f:
            json.dump(kernel_meta, f)

        dest_nb = os.path.join(tmp_dir, os.path.basename(notebook_source_path))
        shutil.copy(notebook_source_path, dest_nb)

        api.kernels_push(folder=tmp_dir)

    return f"{username}/{kernel_slug}"


def get_kernel_status(username: str, api_key: str, kernel_ref: str) -> Dict:
    """Return current kernel status dict."""
    api = _get_api(username, api_key)
    status = api.kernel_status(kernel_ref)
    return {
        "status": status.status,
        "failure_message": status.failure_message,
    }


def download_kernel_output(
    username: str, api_key: str, kernel_ref: str, dest_dir: str
) -> List[str]:
    """
    Download kernel output files (rendered frames) into dest_dir.
    Returns list of downloaded file paths.
    """
    api = _get_api(username, api_key)
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    api.kernel_output(kernel_ref, path=dest_dir)

    # Unzip if necessary
    downloaded = []
    for item in Path(dest_dir).iterdir():
        if item.suffix == ".zip":
            with zipfile.ZipFile(item, "r") as z:
                z.extractall(dest_dir)
            item.unlink()
        else:
            downloaded.append(str(item))

    return [str(p) for p in Path(dest_dir).iterdir()]
