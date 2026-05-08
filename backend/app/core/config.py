from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PetroView API"
    DEBUG: bool = True

    # JWT
    SECRET_KEY: str = "petroview-super-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # DB
    DATABASE_URL: str = "postgresql://postgres:lardjan098@localhost:5432/petroview"

    # Files
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:8080", 
        "http://10.178.46.114:8080", 
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "http://localhost"
    ]

    class Config:
        env_file = ".env"


settings = Settings()