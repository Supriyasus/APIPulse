from pydantic import BaseModel, HttpUrl, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class UrlAnalyzeRequest(BaseModel):
    url: str = Field(..., description="Target API URL to analyze")

class ApiTestResponse(BaseModel):
    id: int
    url: str
    status_code: Optional[int]
    ssl_valid: Optional[bool]
    ssl_expiry: Optional[datetime]
    response_time_ms: Optional[float]
    response_size: Optional[int]
    content_type: Optional[str]
    headers: Optional[Dict[str, str]]
    created_at: datetime

    class Config:
        from_attributes = True

class LoadTestRequest(BaseModel):
    url: str = Field(..., description="Target API URL to load test")
    request_count: int = Field(10, description="Number of concurrent requests (10, 50, 100)")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://jsonplaceholder.typicode.com/posts",
                "request_count": 50
            }
        }

class LoadTestResponse(BaseModel):
    id: int
    url: str
    request_count: int
    avg_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    requests_per_sec: float
    error_rate_pct: float
    latency_data: Optional[List[float]]
    created_at: datetime

    class Config:
        from_attributes = True

class ChaosTestRequest(BaseModel):
    url: str = Field(..., description="Target API URL to chaos test")
    simulation_type: str = Field(..., description="Type of failure to simulate: latency, timeout, retry, packet_loss")
    config: Dict[str, Any] = Field(..., description="Configuration dict for the chosen simulation")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://jsonplaceholder.typicode.com/posts",
                "simulation_type": "latency",
                "config": {"latency_ms": 500}
            }
        }

class ChaosRunResponse(BaseModel):
    id: int
    url: str
    simulation_type: str
    config: Dict[str, Any]
    success_rate_pct: float
    avg_response_time_ms: float
    error_count: int
    total_requests: int
    details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class PerformanceReportResponse(BaseModel):
    id: int
    url: str
    overall_score: int
    recommendations: List[Dict[str, Any]]
    metrics_summary: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
