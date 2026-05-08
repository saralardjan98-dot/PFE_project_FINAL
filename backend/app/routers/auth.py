"""
Authentication router — handles login, register, and /me endpoint.
Frontend calls:
  POST /api/v1/auth/login      → { access_token }
  POST /api/v1/auth/register   → user object
  GET  /api/v1/auth/me         → current user (used by useAuth hook)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserOut, UserOutFull
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ─────────────── POST /auth/login ───────────────
@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email + password.
    Returns JWT access_token.
    Frontend stores it in localStorage as 'access_token'.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Compte désactivé")

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


# ─────────────── POST /auth/register ───────────────
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account.
    Frontend sends: { email, password, full_name, username, role }
    """
    # Check for duplicate email
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Check for duplicate username if provided
    if user_in.username and db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")

    # Only allow role assignment by checking if any admin exists; first user becomes admin
    total_users = db.query(User).count()
    role = user_in.role if user_in.role in ("admin", "user") else "user"
    if total_users == 0:
        role = "admin"  # first registered user is automatically admin

    new_user = User(
        email=user_in.email,
        username=user_in.username or user_in.email.split("@")[0],
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ─────────────── GET /auth/me ───────────────
@router.get("/me", response_model=UserOutFull)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns current authenticated user profile.
    Used by useAuth hook on startup to restore session.
    Returns role field used by useRole() hook.
    """
    return current_user
