from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from app.database.session import get_db
from app.schemas.schemas import (
    UrlAnalyzeRequest,
    ApiTestResponse,
    LoadTestRequest,
    LoadTestResponse,
    ChaosTestRequest,
    ChaosRunResponse,
    PerformanceReportResponse
)
from app.models.models import ApiTest, LoadTestResult, ChaosRun, PerformanceReport
from app.services.health import run_health_check
from app.services.load_test import run_load_test
from app.services.chaos_engine import run_chaos_test
from app.services.reports import create_performance_report
from app.services.cache import cache_service

router = APIRouter()

@router.post("/health/analyze", response_model=ApiTestResponse)
async def analyze_health(req: UrlAnalyzeRequest, request: Request, db: Session = Depends(get_db)):
    # 1. Check Rate Limit
    client_ip = request.client.host if request.client else "unknown"
    if cache_service.check_rate_limit(client_ip, limit=20, window_seconds=60):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")

    # 2. Check Cache
    cache_key = f"health_cache:{req.url}"
    cached_data = cache_service.get(cache_key)
    if cached_data:
        # Return mock / cached model response matching structure
        # If cache expired or not found, we fetch new
        print(f"Returning cached health check for {req.url}")
        # Parse datetime back to timezone-aware if present
        if cached_data.get("ssl_expiry"):
            cached_data["ssl_expiry"] = cached_data["ssl_expiry"].replace("Z", "+00:00")
        return cached_data

    # 3. Perform check
    result = await run_health_check(req.url, db)
    
    # 4. Save to cache (cache for 15s)
    serializable = {
        "id": result.id,
        "url": result.url,
        "status_code": result.status_code,
        "ssl_valid": result.ssl_valid,
        "ssl_expiry": result.ssl_expiry.isoformat() if result.ssl_expiry else None,
        "response_time_ms": result.response_time_ms,
        "response_size": result.response_size,
        "content_type": result.content_type,
        "headers": result.headers,
        "created_at": result.created_at.isoformat()
    }
    cache_service.set(cache_key, serializable, expire_seconds=15)

    return result

@router.post("/load-test/run", response_model=LoadTestResponse)
async def load_test(req: LoadTestRequest, request: Request, db: Session = Depends(get_db)):
    # Check Rate Limit
    client_ip = request.client.host if request.client else "unknown"
    if cache_service.check_rate_limit(client_ip, limit=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Load tests are resource-intensive.")

    if req.request_count not in [10, 50, 100]:
        raise HTTPException(status_code=400, detail="Invalid request count. Choose 10, 50, or 100.")

    result = await run_load_test(req.url, req.request_count, db)
    return result

@router.post("/chaos/run", response_model=ChaosRunResponse)
async def chaos_run(req: ChaosTestRequest, db: Session = Depends(get_db)):
    if req.simulation_type not in ["latency", "timeout", "packet_loss", "retry"]:
        raise HTTPException(status_code=400, detail="Invalid simulation type.")
        
    result = await run_chaos_test(req.url, req.simulation_type, req.config, db)
    return result

@router.post("/reports/generate", response_model=PerformanceReportResponse)
async def generate_report(req: UrlAnalyzeRequest, db: Session = Depends(get_db)):
    result = await create_performance_report(req.url, db)
    return result

@router.get("/history/tests", response_model=List[ApiTestResponse])
async def get_test_history(db: Session = Depends(get_db)):
    return db.query(ApiTest).order_by(desc(ApiTest.created_at)).limit(20).all()

@router.get("/history/reports", response_model=List[PerformanceReportResponse])
async def get_report_history(db: Session = Depends(get_db)):
    return db.query(PerformanceReport).order_by(desc(PerformanceReport.created_at)).limit(20).all()

@router.get("/history/chaos", response_model=List[ChaosRunResponse])
async def get_chaos_history(db: Session = Depends(get_db)):
    return db.query(ChaosRun).order_by(desc(ChaosRun.created_at)).limit(20).all()
