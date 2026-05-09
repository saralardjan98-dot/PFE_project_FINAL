"""
app/routers/files.py
File upload, parsing, and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from datetime import datetime

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.well import Well
from app.models.well_file import WellFile
from app.schemas.user import UserOut
from app.schemas.well_file import WellFileOut
from app.services.file_parser import parse_file

router = APIRouter(prefix="", tags=["Files"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@router.post("/files/parse-metadata")
def parse_file_metadata(
    file: UploadFile = File(...),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Parse a LAS file and return its metadata without saving.
    Used for auto-filling the 'Add Well' form.
    """
    filename = file.filename or "unknown"
    file_ext = filename.split(".")[-1].lower()
    if file_ext != "las":
        raise HTTPException(status_code=400, detail="Only LAS files are supported for auto-fill")

    # Temporary save to parse
    temp_path = f"temp_{datetime.now().timestamp()}_{filename}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        parsed = parse_file(temp_path, "las")
        if "error" in parsed:
            raise HTTPException(status_code=400, detail=parsed["error"])
        
        return parsed.get("metadata", {})
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/files/upload/{well_id}", response_model=WellFileOut)
def upload_file(
    well_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Upload LAS or CSV file to a well.
    If LAS, auto-populate empty well metadata.
    """
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    filename = file.filename or "unknown"
    file_ext = filename.split(".")[-1].lower()
    if file_ext not in ["las", "csv", "xlsx", "xls", "json"]:
        raise HTTPException(
            status_code=400,
            detail="Only .las, .csv, .xlsx, and .json files are supported"
        )

    file_path = os.path.join(UPLOAD_DIR, f"{well_id}_{datetime.now().timestamp()}_{filename}")
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    parsed = parse_file(file_path, file_ext)
    
    curves = []
    if not parsed.get("error"):
        curves = parsed.get("curves", [])
        # Auto-populate well metadata if LAS
        if file_ext == "las" and "metadata" in parsed:
            metadata = parsed["metadata"]
            for field, value in metadata.items():
                if hasattr(well, field) and getattr(well, field) is None and value is not None:
                    setattr(well, field, value)
            db.commit()

    db_file = WellFile(
        well_id=well_id,
        name=filename,
        file_type=file_ext.upper(),
        file_path=file_path,
        size=os.path.getsize(file_path),
        curves=curves,
        uploaded_at=datetime.utcnow(),
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return WellFileOut.from_orm(db_file)


@router.get("/files/{file_id}", response_model=WellFileOut)
def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Get file details
    """
    well_file = db.query(WellFile).filter(WellFile.id == file_id).first()
    if not well_file:
        raise HTTPException(status_code=404, detail="File not found")

    # ── Check access ──
    well = db.query(Well).filter(Well.id == well_file.well_id).first()
    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    return WellFileOut.from_orm(well_file)


@router.get("/files/{file_id}/curves")
def get_file_curves(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Get curve data from a well file (LAS/CSV)
    Returns array of data points with depth and curve values
    
    Example response:
    [
      {"depth": 1000, "GR": 45.2, "RHOB": 2.45, "NPHI": 0.25},
      {"depth": 1000.5, "GR": 46.1, "RHOB": 2.44, "NPHI": 0.26},
      ...
    ]
    """
    # ── Get file ──
    well_file = db.query(WellFile).filter(WellFile.id == file_id).first()
    if not well_file:
        raise HTTPException(status_code=404, detail="File not found")

    # ── Check access ──
    well = db.query(Well).filter(Well.id == well_file.well_id).first()
    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Check if file exists ──
    if not os.path.exists(well_file.file_path):
        raise HTTPException(
            status_code=404,
            detail="File on disk not found"
        )

    # ── Parse file and extract curves ──
    parsed = parse_file(well_file.file_path, well_file.file_type.lower())

    if parsed.get("error"):
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing file: {parsed['error']}"
        )

    # ── Return curve data ──
    return parsed.get("data", [])


@router.get("/wells/{well_id}/files", response_model=List[WellFileOut])
def get_well_files(
    well_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Get all files for a well
    """
    # ── Verify well exists ──
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    # ── Check access ──
    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Get files ──
    files = db.query(WellFile).filter(WellFile.well_id == well_id).all()
    return [WellFileOut.from_orm(f) for f in files]


@router.delete("/files/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Delete a file
    """
    well_file = db.query(WellFile).filter(WellFile.id == file_id).first()
    if not well_file:
        raise HTTPException(status_code=404, detail="File not found")

    # ── Check access ──
    well = db.query(Well).filter(Well.id == well_file.well_id).first()
    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Delete from disk ──
    try:
        if os.path.exists(well_file.file_path):
            os.remove(well_file.file_path)
    except Exception as e:
        print(f"Warning: Could not delete file from disk: {e}")

    # ── Delete from database ──
    db.delete(well_file)
    db.commit()

    return {"message": "File deleted"}


@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Download the raw stored file
    """
    well_file = db.query(WellFile).filter(WellFile.id == file_id).first()
    if not well_file:
        raise HTTPException(status_code=404, detail="File not found")

    # ── Check access ──
    well = db.query(Well).filter(Well.id == well_file.well_id).first()
    if well.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(well_file.file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")

    # Set media type based on extension
    media_type = "application/octet-stream"
    ext = well_file.file_type.lower()
    if ext == "json":
        media_type = "application/json"
    elif ext == "csv":
        media_type = "text/csv"
    elif ext in ["xlsx", "xls"]:
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return FileResponse(
        path=well_file.file_path,
        media_type=media_type,
        filename=well_file.name
    )