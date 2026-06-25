from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database.session import Base

class ApiTest(Base):
    __tablename__ = "api_tests"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    status_code = Column(Integer, nullable=True)
    ssl_valid = Column(Boolean, nullable=True)
    ssl_expiry = Column(DateTime(timezone=True), nullable=True)
    response_time_ms = Column(Float, nullable=True)
    response_size = Column(Integer, nullable=True)
    content_type = Column(String, nullable=True)
    headers = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LoadTestResult(Base):
    __tablename__ = "load_test_results"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    request_count = Column(Integer, nullable=False)
    avg_latency_ms = Column(Float, nullable=False)
    min_latency_ms = Column(Float, nullable=False)
    max_latency_ms = Column(Float, nullable=False)
    p95_latency_ms = Column(Float, nullable=False)
    p99_latency_ms = Column(Float, nullable=False)
    requests_per_sec = Column(Float, nullable=False)
    error_rate_pct = Column(Float, nullable=False)
    latency_data = Column(JSON, nullable=True) # list of individual latencies/timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChaosRun(Base):
    __tablename__ = "chaos_runs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    simulation_type = Column(String, nullable=False) # latency, timeout, retry, packet_loss
    config = Column(JSON, nullable=False) # e.g. {"latency_ms": 500}
    success_rate_pct = Column(Float, nullable=False)
    avg_response_time_ms = Column(Float, nullable=False)
    error_count = Column(Integer, nullable=False)
    total_requests = Column(Integer, nullable=False)
    details = Column(JSON, nullable=True) # e.g., retry attempt history
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PerformanceReport(Base):
    __tablename__ = "performance_reports"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    overall_score = Column(Integer, nullable=False) # 0-100 rating
    recommendations = Column(JSON, nullable=False) # array of recommendation dicts
    metrics_summary = Column(JSON, nullable=False) # snapshot metrics
    created_at = Column(DateTime(timezone=True), server_default=func.now())
