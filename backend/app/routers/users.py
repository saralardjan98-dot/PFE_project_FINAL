"""
Users router — admin management of user accounts.
Frontend calls:
  GET    /api/v1/users              → list all users  (UserManagement.tsx)
  DELETE /api/v1/users/{id}         → delete user
  PATCH  /api/v1/users/{id}/role    → update role     { role: "admin"|"user" }
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserOut, RoleUpdate
from app.core.security import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["users"])


# ─────────────── GET /users ───────────────
@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),   # admin only
):
    """
    Return all registered users.
    Only accessible by admins.
    Frontend UserManagement.tsx calls getUsers() → GET /users
    Response is a plain list — frontend checks Array.isArray(response) or response.data.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


# ─────────────── DELETE /users/{user_id} ───────────────
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a user by ID.
    Admin cannot delete their own account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")

    db.delete(user)
    db.commit()
    return None


# ─────────────── PATCH /users/{user_id}/role ───────────────
@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Change a user's role.
    Frontend sends: { role: "admin" | "user" }
    """
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Rôle invalide. Valeurs acceptées: 'admin', 'user'")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.role = body.role
    db.commit()
    db.refresh(user)
    return user
