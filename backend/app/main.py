# pyrefly: ignore [missing-import]
import uvicorn
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database.session import Base, engine, check_db_connection
from app.api.endpoints import router as api_router
from app.config import settings

# Create database tables automatically on startup
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {e}")

app = FastAPI(
    title="APIPulse Backend",
    description="Resilience and observability analysis service.",
    version="1.0.0"
)

# Enable CORS for local development and production
origins = [
    "https://api-pulse-hazel.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routes
app.include_router(api_router, prefix="/api")

# ---------------------------------------------------------------------------
# Global error handler — ensures CORS headers are present even on 500 errors.
# FastAPI's CORSMiddleware only runs on responses it generates itself; unhandled
# exceptions bypass it, so the browser sees a response with no CORS headers and
# reports a misleading "CORS error" that hides the real server crash.
# ---------------------------------------------------------------------------
CORS_ORIGINS_SET = set(origins)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in CORS_ORIGINS_SET:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "false"
        headers["Vary"] = "Origin"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
        headers=headers,
    )

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {
        "status": "online",
        "service": "APIPulse Resilience Platform",
        "documentation": "/docs"
    }

@app.get("/system/status")
async def system_status():
    """
    Infrastructure health check endpoint.
    Reports the live status of PostgreSQL and Redis.
    Safe to call at any time — never raises a 500.
    """
    from app.services.cache import cache_service

    db_ok = check_db_connection()
    redis_ok = cache_service.enabled

    overall = "healthy" if db_ok else "degraded"

    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={
            "status": overall,
            "services": {
                "database": {
                    "status": "up" if db_ok else "down",
                    "detail": "PostgreSQL reachable" if db_ok else "Cannot connect to PostgreSQL. Check DATABASE_URL or if Supabase project is paused."
                },
                "cache": {
                    "status": "up" if redis_ok else "down",
                    "detail": "Redis reachable" if redis_ok else "Redis unavailable — caching and rate limiting disabled (non-critical)."
                },
            }
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
