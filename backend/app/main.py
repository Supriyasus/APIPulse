# pyrefly: ignore [missing-import]
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import Base, engine
from app.api.endpoints import router as api_router
from app.config import settings

# Create database tables automatically on startup
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Error initializing database tables: {e}")

app = FastAPI(
    title="ChaosPulse API Backend",
    description="Resilience and observability analysis service.",
    version="1.0.0"
)

# Enable CORS for local react development and production
origins = []
for o in settings.cors_origins.split(","):
    cleaned = o.strip().strip('"').strip("'").rstrip("/")
    if cleaned:
        origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routes
app.include_router(api_router, prefix="/api")

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {
        "status": "online",
        "service": "ChaosPulse API Resilience Platform",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
