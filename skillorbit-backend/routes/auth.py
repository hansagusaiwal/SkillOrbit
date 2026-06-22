from fastapi import APIRouter, HTTPException
from models import LoginRequest, LoginResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    return LoginResponse(
        token="mock-jwt-token",
        user={"email": body.email, "name": "Recruiter"},
    )
