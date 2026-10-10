from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth import router as auth_router
from backend.api.documents import router as documents_router
from backend.api.health import router as health_router
from backend.core.config import get_settings
from backend.core.logging import configure_logging

configure_logging()
settings = get_settings()

app = FastAPI(
    title="Doc Service API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(documents_router)