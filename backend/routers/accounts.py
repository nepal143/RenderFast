import hashlib
import os
import secrets
import base64
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from services.accounts_service import get_all_accounts, add_account, remove_account

router = APIRouter()

# ── OAuth2 config (loaded from .env) ─────────────────────────────────────────
KAGGLE_CLIENT_ID     = os.getenv("KAGGLE_CLIENT_ID", "")
KAGGLE_CLIENT_SECRET = os.getenv("KAGGLE_CLIENT_SECRET", "")
BACKEND_URL          = os.getenv("BACKEND_URL",  "http://localhost:8000")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

KAGGLE_AUTH_URL  = "https://www.kaggle.com/oauth/authorize"
KAGGLE_TOKEN_URL = "https://www.kaggle.com/api/v1/oauth/token"
KAGGLE_ME_URL    = "https://www.kaggle.com/api/v1/users"

REDIRECT_URI = f"{BACKEND_URL}/api/accounts/oauth/callback"

# In-memory PKCE state store (maps state → code_verifier)
# Fine for single-instance dev; swap for Redis in production
_oauth_states: dict[str, str] = {}


def _make_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier  = secrets.token_urlsafe(64)
    digest    = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


# ── Manual API key fallback ───────────────────────────────────────────────────

class AccountIn(BaseModel):
    username: str
    api_key: str


@router.get("/")
def list_accounts():
    accounts = get_all_accounts()
    return [{"username": a["username"], "active": a.get("active", True)} for a in accounts]


@router.post("/")
def create_account(body: AccountIn):
    try:
        account = add_account(body.username, body.api_key)
        return {"username": account["username"], "active": account["active"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{username}")
def delete_account(username: str):
    remove_account(username)
    return {"deleted": username}


# ── OAuth2 endpoints ──────────────────────────────────────────────────────────

@router.get("/oauth/config")
def oauth_config():
    """Tell the frontend whether OAuth is configured."""
    return {"enabled": bool(KAGGLE_CLIENT_ID and KAGGLE_CLIENT_SECRET)}


@router.get("/oauth/start")
def oauth_start():
    """
    Generate a Kaggle OAuth2 authorization URL and return it to the frontend.
    Uses PKCE (S256) — no client secret exposed to the browser.
    """
    if not KAGGLE_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail="OAuth not configured. Set KAGGLE_CLIENT_ID and KAGGLE_CLIENT_SECRET in .env",
        )

    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _make_pkce_pair()
    _oauth_states[state] = code_verifier   # remember verifier for callback

    params = {
        "response_type":         "code",
        "client_id":             KAGGLE_CLIENT_ID,
        "redirect_uri":          REDIRECT_URI,
        "scope":                 "read_datasets write_datasets write_kernels",
        "state":                 state,
        "code_challenge":        code_challenge,
        "code_challenge_method": "S256",
    }
    return {"url": f"{KAGGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/oauth/callback")
async def oauth_callback(code: str = "", state: str = "", error: str = ""):
    """
    Kaggle redirects here after the user authorises.
    Exchanges the code for an access token, fetches the username,
    stores the account, then redirects back to the frontend.
    """
    if error:
        return RedirectResponse(
            f"{FRONTEND_URL}/accounts?oauth_error={error}"
        )

    code_verifier = _oauth_states.pop(state, None)
    if not code_verifier:
        return RedirectResponse(
            f"{FRONTEND_URL}/accounts?oauth_error=invalid_state"
        )

    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            KAGGLE_TOKEN_URL,
            data={
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  REDIRECT_URI,
                "client_id":     KAGGLE_CLIENT_ID,
                "client_secret": KAGGLE_CLIENT_SECRET,
                "code_verifier": code_verifier,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )

    if token_resp.status_code != 200:
        return RedirectResponse(
            f"{FRONTEND_URL}/accounts?oauth_error=token_exchange_failed"
        )

    token_data   = token_resp.json()
    access_token = token_data.get("access_token") or token_data.get("token")
    if not access_token:
        return RedirectResponse(
            f"{FRONTEND_URL}/accounts?oauth_error=no_token_in_response"
        )

    # Fetch the Kaggle username using the token
    username = token_data.get("username")   # Kaggle sometimes includes it in token response
    if not username:
        async with httpx.AsyncClient() as client:
            me_resp = await client.get(
                KAGGLE_ME_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
        if me_resp.status_code == 200:
            me = me_resp.json()
            # Kaggle returns a list or an object depending on endpoint
            if isinstance(me, list) and me:
                username = me[0].get("username") or me[0].get("name")
            elif isinstance(me, dict):
                username = me.get("username") or me.get("name")

    if not username:
        return RedirectResponse(
            f"{FRONTEND_URL}/accounts?oauth_error=could_not_fetch_username"
        )

    # Store as account (access_token acts as the API key for Kaggle API calls)
    try:
        add_account(username, access_token)
    except ValueError:
        # Already exists — update the token silently
        remove_account(username)
        add_account(username, access_token)

    return RedirectResponse(
        f"{FRONTEND_URL}/accounts?oauth_success={username}"
    )
