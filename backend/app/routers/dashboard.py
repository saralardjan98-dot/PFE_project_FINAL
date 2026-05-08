"""
Dashboard router — aggregated statistics for the dashboard page.
Frontend Dashboard.tsx currently uses mock data, but this endpoint
provides real data when connected.
  GET /api/v1/dashboard/stats
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.well import Well
from app.models.well_file import WellFile
from app.models.analysis_result import AnalysisResult
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return aggregated KPIs for the dashboard.
    Response matches StatCard data expected by Dashboard.tsx.
    """
    total_wells = db.query(func.count(Well.id)).scalar() or 0
    total_files = db.query(func.count(WellFile.id)).scalar() or 0
    total_analyses = db.query(func.count(AnalysisResult.id)).scalar() or 0
    active_wells = db.query(func.count(Well.id)).filter(Well.status == "active").scalar() or 0
    drilling_wells = db.query(func.count(Well.id)).filter(Well.status == "drilling").scalar() or 0
    completed_wells = db.query(func.count(Well.id)).filter(Well.status == "completed").scalar() or 0
    inactive_wells = db.query(func.count(Well.id)).filter(Well.status == "inactive").scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0

    # Status breakdown for pie chart
    status_breakdown = [
        {"name": "Actif", "value": active_wells},
        {"name": "Forage", "value": drilling_wells},
        {"name": "Complété", "value": completed_wells},
        {"name": "Inactif", "value": inactive_wells},
    ]

    return {
        "total_wells": total_wells,
        "total_files": total_files,
        "total_analyses": total_analyses,
        "active_wells": active_wells,
        "total_users": total_users,
        "status_breakdown": status_breakdown,
    }
