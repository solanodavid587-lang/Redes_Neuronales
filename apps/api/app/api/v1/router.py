from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.resources import router as resources_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(resources_router)
