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
