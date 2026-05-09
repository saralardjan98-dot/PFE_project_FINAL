"""
Wells router — full CRUD for oil wells.
Frontend calls:
  GET    /api/v1/wells            → list wells (Wells.tsx, WellMap.tsx, Dashboard.tsx)
  POST   /api/v1/wells/           → create well
  GET    /api/v1/wells/{id}       → get single well (WellDetails.tsx)
  PUT    /api/v1/wells/{id}       → update well
  DELETE /api/v1/wells/{id}       → delete well
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.well import Well
from app.models.well_file import WellFile
from app.models.analysis_result import AnalysisResult
from app.schemas.well import WellCreate, WellUpdate, WellOut
from app.schemas.well_file import WellFileOut
from app.schemas.analysis_result import AnalysisResultOut
from app.core.security import get_current_user, get_current_admin
from app.models.user import User

router = APIRouter(prefix="/wells", tags=["wells"])


def _enrich_well(well: Well, db: Session) -> WellOut:
    """Build WellOut with computed filesCount."""
    files_count = db.query(WellFile).filter(WellFile.well_id == well.id).count()
    out = WellOut.model_validate(well)
    object.__setattr__(out, "filesCount", files_count)
    return out


# ─────────────── GET /wells ───────────────
@router.get("", response_model=List[WellOut])
def list_wells(
    field: Optional[str] = Query(None, description="Filter by field name"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all wells, optionally filtered.
    Response is a plain list — frontend handles both list and {items: []} shapes.
    """
    query = db.query(Well)
    if field:
        query = query.filter(Well.field == field)
    if status:
        query = query.filter(Well.status == status)

    wells = query.order_by(Well.created_at.desc()).all()
    return [_enrich_well(w, db) for w in wells]


# ─────────────── POST /wells/ ───────────────
@router.post("/", response_model=WellOut, status_code=201)
def create_well(
    well_in: WellCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new well.
    Frontend sends all LAS metadata fields.
    """
    # Check for duplicate API if provided
    if well_in.api and db.query(Well).filter(Well.api == well_in.api).first():
        raise HTTPException(status_code=400, detail=f"Un puits avec l'API '{well_in.api}' existe déjà")

    new_well = Well(
        **well_in.model_dump(),
        created_by=current_user.id,
    )
    db.add(new_well)
    db.commit()
    db.refresh(new_well)
    return _enrich_well(new_well, db)


# ─────────────── GET /wells/{well_id} ───────────────
@router.get("/{well_id}", response_model=WellOut)
def get_well(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a single well by ID."""
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")
    return _enrich_well(well, db)


# ─────────────── PUT /wells/{well_id} ───────────────
@router.put("/{well_id}", response_model=WellOut)
def update_well(
    well_id: int,
    well_in: WellUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a well's details.
    """
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")

    update_data = well_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(well, field, value)

    db.commit()
    db.refresh(well)
    return _enrich_well(well, db)


# ─────────────── DELETE /wells/{well_id} ───────────────
@router.delete("/{well_id}", status_code=204)
def delete_well(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a well and all associated files/results (cascade).
    Admin only.
    """
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")

    db.delete(well)
    db.commit()
    return None


# ─────────────── GET /wells/{well_id}/files ───────────────
@router.get("/{well_id}/files", response_model=List[WellFileOut])
def get_well_files(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all files associated with a well."""
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")
    return db.query(WellFile).filter(WellFile.well_id == well_id).all()


# ─────────────── GET /wells/{well_id}/analysis ───────────────
@router.get("/{well_id}/analysis", response_model=List[AnalysisResultOut])
def get_well_analysis(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all analysis results for a well."""
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")
    return db.query(AnalysisResult).filter(AnalysisResult.well_id == well_id).all()


# ─────────────── GET /wells/map/data ───────────────
@router.get("/map/data", response_model=List[WellOut])
def get_map_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all wells with lat/lng for map visualization.
    Filters out wells missing coordinates.
    """
    wells = (
        db.query(Well)
        .filter(Well.latitude.isnot(None), Well.longitude.isnot(None))
        .all()
    )
    return [_enrich_well(w, db) for w in wells]
