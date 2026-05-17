import json
import os
from pathlib import Path
from typing import Dict, List

ACCOUNTS_FILE = Path("data/kaggle_accounts.json")


def _load() -> List[Dict]:
    if not ACCOUNTS_FILE.exists():
        return []
    with open(ACCOUNTS_FILE, "r") as f:
        return json.load(f)


def _save(accounts: List[Dict]):
    ACCOUNTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ACCOUNTS_FILE, "w") as f:
        json.dump(accounts, f, indent=2)


def get_all_accounts() -> List[Dict]:
    return _load()


def add_account(username: str, api_key: str) -> Dict:
    accounts = _load()
    for acc in accounts:
        if acc["username"] == username:
            raise ValueError(f"Account '{username}' already exists.")
    new_account = {"username": username, "api_key": api_key, "active": True}
    accounts.append(new_account)
    _save(accounts)
    return new_account


def remove_account(username: str):
    accounts = _load()
    accounts = [a for a in accounts if a["username"] != username]
    _save(accounts)


def get_active_accounts() -> List[Dict]:
    return [a for a in _load() if a.get("active", True)]
