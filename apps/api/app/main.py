from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.api.v1.endpoints.health import router as health_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="NeuroLab Enterprise API",
    version="1.0.0",
    description="API de NeuroLab; autentica las rutas privadas con cuentas locales.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health_router)
app.include_router(health_router, prefix="/api/v1")
app.include_router(v1_router, prefix="/api/v1")
