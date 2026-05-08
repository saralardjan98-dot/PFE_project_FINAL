from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)           # maps to display_name in frontend
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")               # "admin" | "user"
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    wells = relationship("Well", back_populates="created_by_user", lazy="dynamic")
    files = relationship("WellFile", back_populates="uploaded_by_user", lazy="dynamic")
