from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class WellFileOut(BaseModel):
    id: int
    name: str
    file_type: str
    size: Optional[str] = None
    size_bytes: Optional[int] = None
    curves: Optional[List[str]] = []
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    well_name_in_file: Optional[str] = None
    well_id: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class CurveDataPoint(BaseModel):
    depth: float
    value: Optional[float] = None


class CurveData(BaseModel):
    curve_name: str
    unit: Optional[str] = None
    data: List[CurveDataPoint]
