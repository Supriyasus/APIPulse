from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError
from fastapi import HTTPException
from app.config import settings

# pool_pre_ping=True tests the connection before handing it to a request.
# pool_timeout=5 stops requests hanging for 30s (SQLAlchemy default) when DB is down.
# pool_recycle=1800 replaces stale connections every 30 min (important for Supabase).
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_timeout=5,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    FastAPI dependency that yields a DB session.
    Returns HTTP 503 (Service Unavailable) instead of a raw 500 crash
    when the database is unreachable, so the frontend gets a readable error.
    """
    try:
        db = SessionLocal()
        yield db
    except OperationalError as e:
        raise HTTPException(
            status_code=503,
            detail="Database is currently unavailable. Please try again shortly."
        )
    finally:
        try:
            db.close()
        except Exception:
            pass

def check_db_connection() -> bool:
    """Returns True if the database is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
