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

            db.commit()
            print("✅ Utilisateurs par défaut créés avec succès")
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
