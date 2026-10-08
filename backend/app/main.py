import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.api import AppError
from app.routes import analyze, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gitroast")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"GitRoast Backend initialized. LLM Provider: {settings.LLM_PROVIDER}")
    logger.info(f"CORS Origins: {settings.cors_origins_list}")
    yield


app = FastAPI(
    title="GitRoast API",
    description="AI-powered GitHub career coach and diagnostic roast engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    first_err = exc.errors()[0] if exc.errors() else {}
    msg = first_err.get("msg", "Invalid request parameters.")
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "INVALID_USERNAME",
                "message": f"Validation error: {msg}",
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error: {exc}")
    # Never expose stack trace or secret keys to client
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL",
                "message": "An unexpected error occurred while processing your request. Please try again.",
            }
        },
    )


app.include_router(health.router)
app.include_router(analyze.router)
