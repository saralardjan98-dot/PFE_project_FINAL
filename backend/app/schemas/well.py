from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class WellCreate(BaseModel):
    name: str
    code: str
    field: Optional[str] = None
    zone: Optional[str] = None
    region: Optional[str] = None
    operator: Optional[str] = None
    status: Optional[str] = "active"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_depth_m: Optional[float] = None
    depth: Optional[float] = None
    start_date: Optional[str] = None
    description: Optional[str] = None


class WellUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    field: Optional[str] = None
    zone: Optional[str] = None
    region: Optional[str] = None
    operator: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_depth_m: Optional[float] = None
    depth: Optional[float] = None
    start_date: Optional[str] = None
    description: Optional[str] = None


class WellOut(BaseModel):
    # Primary key returned as both id and well_id (frontend uses both)
    id: int
    well_id: Optional[int] = None   # filled by validator below

    name: str
    code: str
    field: Optional[str] = None
    zone: Optional[str] = None
    region: Optional[str] = None
    operator: Optional[str] = None
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_depth_m: Optional[float] = None
    depth: Optional[float] = None
    start_date: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    # Computed: number of associated files
    filesCount: Optional[int] = 0

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        # Ensure well_id mirrors id so frontend can use either field
        if self.well_id is None:
            object.__setattr__(self, "well_id", self.id)
        if self.depth is None and self.total_depth_m is not None:
            object.__setattr__(self, "depth", self.total_depth_m)
        if self.total_depth_m is None and self.depth is not None:
            object.__setattr__(self, "total_depth_m", self.depth)
        if self.region is None and self.zone is not None:
            object.__setattr__(self, "region", self.zone)
        if self.zone is None and self.region is not None:
            object.__setattr__(self, "zone", self.region)
