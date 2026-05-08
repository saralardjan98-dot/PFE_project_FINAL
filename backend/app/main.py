"""
PetroView FastAPI Backend
=========================
Main application factory — mounts all routers, configures CORS,
creates database tables, and seeds initial data on first run.

Base URL : http://localhost:8000
API prefix: /api/v1
Docs      : http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine, Base

# ─── Import all models so SQLAlchemy registers them before create_all ───
from app.models.user import User           # noqa: F401
from app.models.well import Well           # noqa: F401
from app.models.well_file import WellFile  # noqa: F401
from app.models.analysis_result import AnalysisResult  # noqa: F401

# ─── Import routers ───
from app.routers import auth, users, wells, files, analysis, dashboard


# ─── Lifespan: startup / shutdown hooks ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Seed initial data (admin user + sample wells)
    _seed_database()

    yield

    # ── SHUTDOWN ── (nothing to clean up for SQLite)


def _seed_database():
    """
    Insert demo data on first launch so the frontend is not empty.
    Safe to call multiple times — checks for existing records first.
    """
    from app.database.session import SessionLocal
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # ── Admin user ──
        if not db.query(User).filter(User.email == "admin@petroview.dz").first():
            admin = User(
                email="admin@petroview.dz",
                username="admin",
                full_name="Administrateur PetroView",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.flush()

            # ── Regular user ──
            user = User(
                email="user@petroview.dz",
                username="ingenieur1",
                full_name="Ingénieur Pétrophysicien",
                hashed_password=get_password_hash("user123"),
                role="user",
                is_active=True,
            )
            db.add(user)
            db.flush()

            # ── Sample wells ──
            sample_wells = [
                Well(
                    name="Hassi Messaoud HMD-101",
                    code="HMD-101",
                    field="Hassi Messaoud",
                    zone="Ouargla",
                    region="Ouargla",
                    operator="Sonatrach",
                    status="active",
                    latitude=31.6830,
                    longitude=6.0740,
                    total_depth_m=3450.0,
                    depth=3450.0,
                    start_date="2020-03-15",
                    description="Puits producteur principal du champ HMD",
                    created_by=admin.id,
                ),
                Well(
                    name="Hassi Messaoud HMD-102",
                    code="HMD-102",
                    field="Hassi Messaoud",
                    zone="Ouargla",
                    region="Ouargla",
                    operator="Sonatrach",
                    status="drilling",
                    latitude=31.6920,
                    longitude=6.0850,
                    total_depth_m=3200.0,
                    depth=3200.0,
                    start_date="2023-07-01",
                    description="Nouveau puits en cours de forage",
                    created_by=admin.id,
                ),
                Well(
                    name="Rhourde El Baguel REB-05",
                    code="REB-05",
                    field="Rhourde El Baguel",
                    zone="Illizi",
                    region="Illizi",
                    operator="Sonatrach / Eni",
                    status="completed",
                    latitude=29.3100,
                    longitude=7.9800,
                    total_depth_m=2870.0,
                    depth=2870.0,
                    start_date="2018-11-20",
                    description="Puits complété — zone de transition",
                    created_by=admin.id,
                ),
                Well(
                    name="In Salah ISN-03",
                    code="ISN-03",
                    field="In Salah",
                    zone="Tamanrasset",
                    region="Tamanrasset",
                    operator="Sonatrach / BP",
                    status="inactive",
                    latitude=27.1960,
                    longitude=2.4810,
                    total_depth_m=2100.0,
                    depth=2100.0,
                    start_date="2015-04-10",
                    description="Puits gaz désactivé temporairement",
                    created_by=admin.id,
                ),
                Well(
                    name="Berkine BRK-14",
                    code="BRK-14",
                    field="Berkine",
                    zone="Ouargla",
                    region="Ouargla",
                    operator="Sonatrach / Anadarko",
                    status="active",
                    latitude=30.5200,
                    longitude=7.6500,
                    total_depth_m=3800.0,
                    depth=3800.0,
                    start_date="2021-09-05",
                    description="Puits à haute production, formation Triasique",
                    created_by=admin.id,
                ),
                Well(
                    name="Tiguentourine TIG-07",
                    code="TIG-07",
                    field="Tiguentourine",
                    zone="Illizi",
                    region="Illizi",
                    operator="Sonatrach / Statoil",
                    status="active",
                    latitude=28.0700,
                    longitude=9.2500,
                    total_depth_m=3150.0,
                    depth=3150.0,
                    start_date="2022-01-18",
                    description="Puits gaz condensat",
                    created_by=admin.id,
                ),
            ]
            for w in sample_wells:
                db.add(w)
            db.flush()

            # ── Sample analysis results ──
            analyses = [
                AnalysisResult(
                    well_id=sample_wells[0].id,
                    porosity=18.5,
                    water_saturation=32.0,
                    permeability=45.2,
                    net_pay=24.0,
                    shale_volume=12.0,
                    hydrocarbon_saturation=68.0,
                    depth_top=3100.0,
                    depth_bottom=3200.0,
                    analysis_type="petrophysical",
                ),
                AnalysisResult(
                    well_id=sample_wells[1].id,
                    porosity=21.3,
                    water_saturation=28.5,
                    permeability=62.7,
                    net_pay=31.0,
                    shale_volume=9.5,
                    hydrocarbon_saturation=71.5,
                    depth_top=2900.0,
                    depth_bottom=3050.0,
                    analysis_type="petrophysical",
                ),
                AnalysisResult(
                    well_id=sample_wells[2].id,
                    porosity=14.7,
                    water_saturation=45.0,
                    permeability=28.3,
                    net_pay=16.5,
                    shale_volume=18.0,
                    hydrocarbon_saturation=55.0,
                    depth_top=2600.0,
                    depth_bottom=2700.0,
                    analysis_type="petrophysical",
                ),
                AnalysisResult(
                    well_id=sample_wells[3].id,
                    porosity=11.2,
                    water_saturation=58.0,
                    permeability=15.8,
                    net_pay=8.0,
                    shale_volume=22.5,
                    hydrocarbon_saturation=42.0,
                    depth_top=1800.0,
                    depth_bottom=1900.0,
                    analysis_type="petrophysical",
                ),
                AnalysisResult(
                    well_id=sample_wells[4].id,
                    porosity=23.8,
                    water_saturation=22.0,
                    permeability=89.4,
                    net_pay=42.0,
                    shale_volume=7.0,
                    hydrocarbon_saturation=78.0,
                    depth_top=3500.0,
                    depth_bottom=3650.0,
                    analysis_type="petrophysical",
                ),
                AnalysisResult(
                    well_id=sample_wells[5].id,
                    porosity=16.9,
                    water_saturation=38.0,
                    permeability=37.1,
                    net_pay=19.5,
                    shale_volume=14.5,
                    hydrocarbon_saturation=62.0,
                    depth_top=2800.0,
                    depth_bottom=2950.0,
                    analysis_type="petrophysical",
                ),
            ]
            for a in analyses:
                db.add(a)

            db.commit()
            print("✅ Données de démonstration insérées avec succès")
            print("   👤 Admin  : admin@petroview.dz  / admin123")
            print("   👤 User   : user@petroview.dz   / user123")
        else:
            print("ℹ️  Base de données déjà initialisée — seed ignoré")

    except Exception as e:
        db.rollback()
        print(f"⚠️  Erreur lors du seed: {e}")
    finally:
        db.close()


# ─── Application factory ───
app = FastAPI(
    title=settings.APP_NAME,
    description="API backend pour la plateforme PetroView — gestion des données pétrolières",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ───
# Allows the React frontend (Vite dev server) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Router prefix ───
API_PREFIX = "/api/v1"

app.include_router(auth.router,      prefix=API_PREFIX)
app.include_router(users.router,     prefix=API_PREFIX)
app.include_router(wells.router,     prefix=API_PREFIX)
app.include_router(files.router,     prefix=API_PREFIX)
app.include_router(analysis.router,  prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)

# ─── Static files (serve uploaded files if needed) ───
if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─── Root health check ───
@app.get("/", tags=["health"])
def root():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
