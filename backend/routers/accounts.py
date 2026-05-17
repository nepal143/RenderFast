from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.accounts_service import get_all_accounts, add_account, remove_account

router = APIRouter()


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
