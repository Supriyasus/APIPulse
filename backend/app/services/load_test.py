import asyncio
import time
import math
import httpx
from sqlalchemy.orm import Session
from app.models.models import LoadTestResult

def get_percentile(data: list[float], p: float) -> float:
    if not data:
        return 0.0
    s = sorted(data)
    idx = (len(s) - 1) * p / 100.0
    idx_floor = math.floor(idx)
    idx_ceil = math.ceil(idx)
    if idx_floor == idx_ceil:
        return float(s[int(idx)])
    d0 = s[idx_floor] * (idx_ceil - idx)
    d1 = s[idx_ceil] * (idx - idx_floor)
    return float(d0 + d1)

async def single_request(client: httpx.AsyncClient, url: str) -> tuple[float, bool]:
    start = time.perf_counter()
    try:
        response = await client.get(url)
        latency = (time.perf_counter() - start) * 1000.0 # ms
        # 2xx and 3xx are successes
        success = (200 <= response.status_code < 400)
        return latency, success
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000.0
        print(f"Load test request error: {e}")
        return latency, False

async def run_load_test(url: str, request_count: int, db: Session) -> LoadTestResult:
    # Bound the requests
    request_count = min(max(request_count, 1), 100)
    
    limits = httpx.Limits(max_keepalive_connections=request_count, max_connections=request_count)
    
    start_test = time.perf_counter()
    async with httpx.AsyncClient(limits=limits, timeout=10.0, follow_redirects=True) as client:
        # Create asynchronous requests tasks
        tasks = [single_request(client, url) for _ in range(request_count)]
        results = await asyncio.gather(*tasks)
    end_test = time.perf_counter()
    
    total_time_s = end_test - start_test
    
    latencies = [r[0] for r in results]
    successes = [r[1] for r in results]
    
    error_count = successes.count(False)
    error_rate = (error_count / request_count) * 100.0
    
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    min_latency = min(latencies) if latencies else 0.0
    max_latency = max(latencies) if latencies else 0.0
    p95 = get_percentile(latencies, 95)
    p99 = get_percentile(latencies, 99)
    
    requests_per_sec = request_count / total_time_s if total_time_s > 0 else 0
    
    load_test_result = LoadTestResult(
        url=url,
        request_count=request_count,
        avg_latency_ms=avg_latency,
        min_latency_ms=min_latency,
        max_latency_ms=max_latency,
        p95_latency_ms=p95,
        p99_latency_ms=p99,
        requests_per_sec=requests_per_sec,
        error_rate_pct=error_rate,
        latency_data=latencies
    )
    
    db.add(load_test_result)
    db.commit()
    db.refresh(load_test_result)
    
    return load_test_result
