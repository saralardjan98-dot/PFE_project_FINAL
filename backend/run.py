#!/usr/bin/env python3
"""
Quick-start script for PetroView backend.
Run: python run.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,        # auto-reload on code changes (dev mode)
        log_level="info",
    )
