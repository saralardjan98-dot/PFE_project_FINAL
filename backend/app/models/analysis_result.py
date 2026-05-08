from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database.session import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)

    # Petrophysical properties — matching frontend field names exactly
    porosity = Column(Float, nullable=True)             # porosité (%)
    water_saturation = Column(Float, nullable=True)     # saturation en eau (%)
    permeability = Column(Float, nullable=True)         # perméabilité (mD)
    net_pay = Column(Float, nullable=True)              # épaisseur utile (m)
    shale_volume = Column(Float, nullable=True)         # volume argile (%)
    hydrocarbon_saturation = Column(Float, nullable=True)

    # Depth interval
    depth_top = Column(Float, nullable=True)
    depth_bottom = Column(Float, nullable=True)

    # Metadata
    analysis_type = Column(String, nullable=True)       # e.g. "petrophysical"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Foreign keys
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    well = relationship("Well", back_populates="analysis_results")
