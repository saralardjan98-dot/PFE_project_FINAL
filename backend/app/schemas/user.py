from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- User ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "user"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class RoleUpdate(BaseModel):
    role: str  # "admin" | "user"


class UserOut(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: Optional[str] = None    # frontend reads display_name alias below
    role: str
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    # Aliases expected by frontend UserManagement.tsx
    @property
    def display_name(self):
        return self.full_name

    @property
    def user_id(self):
        return str(self.id)

    model_config = {"from_attributes": True}


class UserOutFull(UserOut):
    """Returned by /auth/me — includes role for useRole() hook"""
    pass
