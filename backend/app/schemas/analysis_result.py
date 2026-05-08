from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AnalysisResultCreate(BaseModel):
    well_id: int
    porosity: Optional[float] = None
    water_saturation: Optional[float] = None
    permeability: Optional[float] = None
    net_pay: Optional[float] = None
    shale_volume: Optional[float] = None
    hydrocarbon_saturation: Optional[float] = None
    depth_top: Optional[float] = None
    depth_bottom: Optional[float] = None
    analysis_type: Optional[str] = "petrophysical"
    notes: Optional[str] = None


class AnalysisResultOut(BaseModel):
    id: int
    well_id: int
    porosity: Optional[float] = None
    water_saturation: Optional[float] = None
    permeability: Optional[float] = None
    net_pay: Optional[float] = None
    shale_volume: Optional[float] = None
    hydrocarbon_saturation: Optional[float] = None
    depth_top: Optional[float] = None
    depth_bottom: Optional[float] = None
    analysis_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    # Frontend uses camelCase-like names in Analysis.tsx
    @property
    def waterSaturation(self):
        return self.water_saturation

    @property
    def netPay(self):
        return self.net_pay

    @property
    def shaleVolume(self):
        return self.shale_volume

    model_config = {"from_attributes": True}
