from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.models import ApiTest, LoadTestResult, ChaosRun, PerformanceReport

def generate_recommendations(api_test: ApiTest, load_test: LoadTestResult, chaos_runs: list[ChaosRun]) -> list[dict]:
    recs = []
    
    # 1. Health Checks / SSL
    if api_test:
        if not api_test.ssl_valid:
            recs.append({
                "type": "SSL_INVALID",
                "severity": "high",
                "message": "No valid SSL certificate found or certificate check failed.",
                "action": "Ensure HTTPS is configured correctly and the certificate is signed by a trusted authority."
            })
        elif api_test.ssl_expiry:
            days_left = (api_test.ssl_expiry - datetime.now(timezone.utc)).days
            if days_left < 14:
                recs.append({
                    "type": "SSL_EXPIRY",
                    "severity": "high",
                    "message": f"SSL Certificate expires in {days_left} days.",
                    "action": f"Renew your certificate immediately before it expires on {api_test.ssl_expiry.strftime('%Y-%m-%d')}."
                })
            elif days_left < 30:
                recs.append({
                    "type": "SSL_EXPIRY_WARNING",
                    "severity": "medium",
                    "message": f"SSL Certificate expires in {days_left} days.",
                    "action": "Plan to renew your certificate soon to avoid disruptions."
                })

        # Cache headers check
        headers = api_test.headers or {}
        cache_control = headers.get("cache-control", headers.get("Cache-Control"))
        if not cache_control:
            recs.append({
                "type": "CACHE_MISSING",
                "severity": "medium",
                "message": "No Cache-Control headers found in API response.",
                "action": "Consider setting Cache-Control headers (e.g., 'public, max-age=3600') for static or slow-moving endpoints."
            })
            
        # Compression check
        encoding = headers.get("content-encoding", headers.get("Content-Encoding"))
        if not encoding or ("gzip" not in encoding and "br" not in encoding):
            recs.append({
                "type": "COMPRESSION_DISABLED",
                "severity": "low",
                "message": "API response is not compressed (Gzip or Brotli).",
                "action": "Enable Gzip or Brotli compression on your origin server (Nginx/Cloudflare) to reduce payload size."
            })

    # 2. Load Testing
    if load_test:
        if load_test.avg_latency_ms > 500.0:
            recs.append({
                "type": "HIGH_LATENCY",
                "severity": "high",
                "message": f"High average latency detected under load ({load_test.avg_latency_ms:.1f} ms).",
                "action": "Optimize database queries, apply indexes, or introduce Redis caching for frequently accessed data."
            })
        elif load_test.avg_latency_ms > 200.0:
            recs.append({
                "type": "MODERATE_LATENCY",
                "severity": "medium",
                "message": f"Moderate average latency detected under load ({load_test.avg_latency_ms:.1f} ms).",
                "action": "Analyze code profiles, minimize downstream API blockages, or use async programming."
            })

        if load_test.error_rate_pct > 5.0:
            recs.append({
                "type": "HIGH_ERROR_RATE",
                "severity": "high",
                "message": f"Critical error rate detected ({load_test.error_rate_pct:.1f}%) during load test.",
                "action": "Review application logs for unhandled exceptions, database pool exhaustions, or memory limits."
            })

        # P95 variance
        ratio = load_test.p95_latency_ms / load_test.avg_latency_ms if load_test.avg_latency_ms > 0 else 1.0
        if ratio > 2.0:
            recs.append({
                "type": "LATENCY_SPIKES",
                "severity": "medium",
                "message": f"Significant variance between P95 ({load_test.p95_latency_ms:.1f} ms) and Average ({load_test.avg_latency_ms:.1f} ms) latencies.",
                "action": "Investigate garbage collection spikes, thread starvation, or resource lock contention."
            })

    # 3. Chaos resilience
    for cr in chaos_runs:
        if cr.simulation_type == "packet_loss" and cr.success_rate_pct < 80.0:
            recs.append({
                "type": "CHAOS_PACKET_LOSS",
                "severity": "high",
                "message": f"API is highly vulnerable to packet loss: only {cr.success_rate_pct:.1f}% success rate under {cr.config.get('packet_loss_pct', 20)}% loss.",
                "action": "Implement a retry policy with exponential backoff on client applications, or deploy network redundant gateways."
            })
        elif cr.simulation_type == "timeout" and cr.success_rate_pct < 80.0:
            recs.append({
                "type": "CHAOS_TIMEOUT",
                "severity": "medium",
                "message": f"API requests aborted under timeout constraints. Success rate was {cr.success_rate_pct:.1f}% when abort limit was {cr.config.get('timeout_s', 1.0)}s.",
                "action": "Optimize slow operations, run backend jobs in parallel, or apply circuit breaker patterns to prevent cascading timeouts."
            })

    # Default if everything is clean
    if not recs:
        recs.append({
            "type": "ALL_GREEN",
            "severity": "low",
            "message": "Excellent performance and resilience parameters detected.",
            "action": "Continue monitoring. Establish threshold alerts to capture regressions early."
        })
        
    return recs

async def create_performance_report(url: str, db: Session) -> PerformanceReport:
    # Ensure scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # Fetch latest health, load test and chaos runs
    api_test = db.query(ApiTest).filter(ApiTest.url == url).order_by(desc(ApiTest.created_at)).first()
    load_test = db.query(LoadTestResult).filter(LoadTestResult.url == url).order_by(desc(LoadTestResult.created_at)).first()
    chaos_runs = db.query(ChaosRun).filter(ChaosRun.url == url).order_by(desc(ChaosRun.created_at)).limit(5).all()

    # Calculate overall resilience score (out of 100)
    score = 100
    
    if api_test:
        if api_test.status_code != 200:
            score -= 15
        if not api_test.ssl_valid:
            score -= 10
        # Latency penalty
        if api_test.response_time_ms:
            if api_test.response_time_ms > 1000.0:
                score -= 15
            elif api_test.response_time_ms > 400.0:
                score -= 8
            elif api_test.response_time_ms > 150.0:
                score -= 3
    else:
        score -= 20 # no health test run

    if load_test:
        # Error penalty
        error_penalty = int(min(load_test.error_rate_pct * 1.5, 30))
        score -= error_penalty
        
        # Load latency penalty
        if load_test.avg_latency_ms > 800.0:
            score -= 15
        elif load_test.avg_latency_ms > 300.0:
            score -= 8
    else:
        score -= 10 # no load test run

    # Ensure score stays in [0, 100] bounds
    score = max(min(score, 100), 0)

    # Generate recommendations array
    recs = generate_recommendations(api_test, load_test, chaos_runs)

    # Metrics Summary
    summary = {
        "latest_latency_ms": api_test.response_time_ms if (api_test and api_test.response_time_ms) else None,
        "load_test_avg_ms": load_test.avg_latency_ms if load_test else None,
        "load_test_p95_ms": load_test.p95_latency_ms if load_test else None,
        "load_test_errors_pct": load_test.error_rate_pct if load_test else None,
        "ssl_status": "Valid" if (api_test and api_test.ssl_valid) else ("Invalid" if api_test else "Unknown"),
    }

    report = PerformanceReport(
        url=url,
        overall_score=score,
        recommendations=recs,
        metrics_summary=summary
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report
