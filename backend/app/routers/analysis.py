"""
Analysis router — manage petrophysical analysis results.
Frontend calls (Analysis.tsx, WellDetails.tsx):
  GET    /api/v1/analysis                  → all results (for Analysis.tsx comparison view)
  POST   /api/v1/analysis                  → create result
  GET    /api/v1/analysis/{id}             → single result
  PUT    /api/v1/analysis/{id}             → update result
  DELETE /api/v1/analysis/{id}             → delete result
  GET    /api/v1/analysis/well/{well_id}   → results for one well
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.analysis_result import AnalysisResult
from app.models.well import Well
from app.models.user import User
from app.schemas.analysis_result import AnalysisResultCreate, AnalysisResultOut
from app.core.security import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


# ─────────────── GET /analysis ───────────────
@router.get("", response_model=List[AnalysisResultOut])
def list_all_analysis(
    well_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all analysis results, optionally filtered by well_id.
    Used by Analysis.tsx for multi-well comparison charts.
    """
    query = db.query(AnalysisResult)
    if well_id:
        query = query.filter(AnalysisResult.well_id == well_id)
    return query.order_by(AnalysisResult.created_at.desc()).all()


# ─────────────── POST /analysis ───────────────
@router.post("", response_model=AnalysisResultOut, status_code=201)
def create_analysis(
    result_in: AnalysisResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new analysis result for a well.
    Accepts: porosity, water_saturation, permeability, net_pay, shale_volume, etc.
    """
    well = db.query(Well).filter(Well.id == result_in.well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")

    new_result = AnalysisResult(**result_in.model_dump())
    db.add(new_result)
    db.commit()
    db.refresh(new_result)
    return new_result


# ─────────────── GET /analysis/{result_id} ───────────────
@router.get("/{result_id}", response_model=AnalysisResultOut)
def get_analysis(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    return result


# ─────────────── PUT /analysis/{result_id} ───────────────
@router.put("/{result_id}", response_model=AnalysisResultOut)
def update_analysis(
    result_id: int,
    result_in: AnalysisResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Résultat introuvable")

    update_data = result_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(result, field, value)

    db.commit()
    db.refresh(result)
    return result


# ─────────────── DELETE /analysis/{result_id} ───────────────
@router.delete("/{result_id}", status_code=204)
def delete_analysis(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Résultat introuvable")
    db.delete(result)
    db.commit()
    return None


# ─────────────── GET /analysis/well/{well_id} ───────────────
@router.get("/well/{well_id}", response_model=List[AnalysisResultOut])
def get_well_analysis(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all analysis results for a specific well."""
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Puits introuvable")
    return (
        db.query(AnalysisResult)
        .filter(AnalysisResult.well_id == well_id)
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )


# ─────────────── POST /analysis/import ───────────────
@router.post("/import", status_code=201)
def import_analysis(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk-import analysis results from a CSV or JSON file.
    CSV expected columns: well_id, porosity, water_saturation, permeability,
                          net_pay, shale_volume, depth_top, depth_bottom, notes
    JSON: list of objects with same keys.
    Returns {imported: N, errors: [...]}
    """
    import io, csv, json as _json

    content = file.file.read()
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()

    rows = []
    parse_error = None
    try:
        if ext == "csv":
            reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
            rows = list(reader)
        elif ext == "json":
            parsed = _json.loads(content)
            rows = parsed if isinstance(parsed, list) else parsed.get("data", [parsed])
        else:
            raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")

    FLOAT_FIELDS = [
        "porosity", "water_saturation", "permeability",
        "net_pay", "shale_volume", "hydrocarbon_saturation",
        "depth_top", "depth_bottom",
    ]
    imported = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            well_id = int(row.get("well_id", 0))
            if not well_id:
                errors.append(f"Row {i+1}: missing well_id")
                continue
            well = db.query(Well).filter(Well.id == well_id).first()
            if not well:
                errors.append(f"Row {i+1}: well_id={well_id} not found")
                continue

            data = {"well_id": well_id}
            for f in FLOAT_FIELDS:
                val = row.get(f)
                if val not in (None, "", "null"):
                    try:
                        data[f] = float(val)
                    except ValueError:
                        errors.append(f"Row {i+1}: invalid value for {f}={val!r}")
            data["notes"] = row.get("notes", "")
            data["analysis_type"] = row.get("analysis_type", "petrophysical")

            db.add(AnalysisResult(**data))
            imported += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")

    db.commit()
    return {"imported": imported, "errors": errors}

