# v1.0.1 - Project Status: Stable & LAS Standardized
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database.session import Base


class Well(Base):
    __tablename__ = "wells"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)           # WELL
    api = Column(String, nullable=True)            # API
    field = Column(String, nullable=True)           # FLD
    location = Column(String, nullable=True)        # LOC
    county = Column(String, nullable=True)          # CNTY
    state = Column(String, nullable=True)           # STAT / Region
    country = Column(String, nullable=True)         # CTRY
    company = Column(String, nullable=True)         # COMP / Operator
    service_company = Column(String, nullable=True) # SRVC
    date = Column(String, nullable=True)            # DATE
    start_depth = Column(Float, nullable=True)      # STRT
    stop_depth = Column(Float, nullable=True)       # STOP
    step = Column(Float, nullable=True)             # STEP
    null_value = Column(Float, nullable=True)       # NULL
    latitude = Column(Float, nullable=True)         # LATI
    longitude = Column(Float, nullable=True)        # LONG
    
    status = Column(String, default="active")       # active | drilling | completed | inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key to creator
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    created_by_user = relationship("User", back_populates="wells")
    files = relationship("WellFile", back_populates="well", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="well", cascade="all, delete-orphan")
