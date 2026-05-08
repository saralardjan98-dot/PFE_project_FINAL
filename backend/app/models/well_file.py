from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.database.session import Base


class WellFile(Base):
    __tablename__ = "well_files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)               # original filename
    file_type = Column(String, nullable=False)          # "LAS" | "CSV"
    file_path = Column(String, nullable=False)          # server path
    size = Column(String, nullable=True)                # human-readable size e.g. "2.3 MB"
    size_bytes = Column(Integer, nullable=True)

    # Extracted metadata
    curves = Column(JSON, nullable=True)                # list of curve names e.g. ["GR","RHOB"]
    depth_min = Column(Float, nullable=True)
    depth_max = Column(Float, nullable=True)
    well_name_in_file = Column(String, nullable=True)   # well name from LAS header

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Foreign keys
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    well = relationship("Well", back_populates="files")
    uploaded_by_user = relationship("User", back_populates="files")
