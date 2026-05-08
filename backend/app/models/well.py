from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database.session import Base


class Well(Base):
    __tablename__ = "wells"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    field = Column(String, nullable=True)           # champ pétrolier
    zone = Column(String, nullable=True)            # region / zone
    region = Column(String, nullable=True)          # alias for zone (frontend uses both)
    operator = Column(String, nullable=True)
    status = Column(String, default="active")       # active | drilling | completed | inactive
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    total_depth_m = Column(Float, nullable=True)    # profondeur totale en mètres
    depth = Column(Float, nullable=True)            # alias used in edit form
    start_date = Column(String, nullable=True)      # date de début (string for flexibility)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key to creator
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by_user = relationship("User", back_populates="wells")
    files = relationship("WellFile", back_populates="well", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="well", cascade="all, delete-orphan")
