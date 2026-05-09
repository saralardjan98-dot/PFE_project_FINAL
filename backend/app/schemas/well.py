# v1.0.1 - Project Status: Stable & LAS Standardized
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class WellBase(BaseModel):
    name: str
    api: Optional[str] = None
    field: Optional[str] = None
    location: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    company: Optional[str] = None
    service_company: Optional[str] = None
    date: Optional[str] = None
    start_depth: Optional[float] = None
    stop_depth: Optional[float] = None
    step: Optional[float] = None
    null_value: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "active"


class WellCreate(WellBase):
    pass


class WellUpdate(BaseModel):
    name: Optional[str] = None
    api: Optional[str] = None
    field: Optional[str] = None
    location: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    company: Optional[str] = None
    service_company: Optional[str] = None
    date: Optional[str] = None
    start_depth: Optional[float] = None
    stop_depth: Optional[float] = None
    step: Optional[float] = None
    null_value: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None


class WellOut(WellBase):
    id: int
    well_id: Optional[int] = None
    created_at: datetime
    filesCount: Optional[int] = 0

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        if self.well_id is None:
            object.__setattr__(self, "well_id", self.id)
