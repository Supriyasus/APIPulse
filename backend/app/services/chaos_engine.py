import asyncio
import time
import random
from sqlalchemy.orm import Session
from app.models.models import ChaosRun

async def run_chaos_test(url: str, simulation_type: str, config: dict, db: Session) -> ChaosRun:
    # Ensure scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    total_requests = 10 # Default batch size for tests
    success_count = 0
    total_latency = 0.0
    error_count = 0
    details = {}

    if simulation_type == "latency":
        # Latency Injection: Add artificial delay before request
        latency_ms = config.get("latency_ms", 500)
        latencies = []
        
        async with httpx_AsyncClient_wrapper() as client:
            for _ in range(5): # run 5 requests
                start = time.perf_counter()
                await asyncio.sleep(latency_ms / 1000.0) # Artificial delay
                try:
                    response = await client.get(url, timeout=10.0)
                    duration = (time.perf_counter() - start) * 1000.0
                    if 200 <= response.status_code < 400:
                        success_count += 1
                    else:
                        error_count += 1
                    latencies.append(duration)
                except Exception:
                    duration = (time.perf_counter() - start) * 1000.0
                    error_count += 1
                    latencies.append(duration)
        
        total_requests = 5
        avg_response_time = sum(latencies) / len(latencies) if latencies else 0.0
        success_rate = (success_count / total_requests) * 100.0
        details = {"latencies": latencies, "injected_delay_ms": latency_ms}

    elif simulation_type == "timeout":
        # Timeout Simulation: Abort request after timeout_s
        timeout_s = float(config.get("timeout_s", 1.0))
        # To guarantee a timeout simulation matches user expectations,
        # we can artificially inject a delay that exceeds the timeout.
        inject_server_delay = config.get("inject_server_delay", True)
        
        latencies = []
        timeout_errors = 0
        
        async with httpx_AsyncClient_wrapper() as client:
            for _ in range(5):
                start = time.perf_counter()
                try:
                    # If we want to simulate timeout on a fast API, we either set a microscopic timeout,
                    # or we sleep inside the client loop before checking or we wrap the call.
                    # Let's simulate that the connection itself is sluggish.
                    if inject_server_delay:
                        # Sleep longer than timeout to force it to fail
                        await asyncio.sleep(timeout_s + 0.2)
                    
                    response = await client.get(url, timeout=timeout_s)
                    duration = (time.perf_counter() - start) * 1000.0
                    if 200 <= response.status_code < 400:
                        success_count += 1
                    else:
                        error_count += 1
                    latencies.append(duration)
                except (asyncio.TimeoutError, httpx_TimeoutException) as e:
                    duration = (time.perf_counter() - start) * 1000.0
                    error_count += 1
                    timeout_errors += 1
                    latencies.append(duration)
                except Exception:
                    duration = (time.perf_counter() - start) * 1000.0
                    error_count += 1
                    latencies.append(duration)
        
        total_requests = 5
        avg_response_time = sum(latencies) / len(latencies) if latencies else 0.0
        success_rate = (success_count / total_requests) * 100.0
        details = {
            "latencies": latencies, 
            "timeout_limit_s": timeout_s, 
            "timeout_failures": timeout_errors,
            "simulated_timeout": inject_server_delay
        }

    elif simulation_type == "packet_loss":
        # Packet Loss Simulation: Randomly drop percentage of requests
        loss_pct = config.get("packet_loss_pct", 20)
        latencies = []
        dropped_requests = 0
        
        async with httpx_AsyncClient_wrapper() as client:
            for _ in range(10):
                start = time.perf_counter()
                # Determine drop
                if random.randint(1, 100) <= loss_pct:
                    # Simulate drop
                    await asyncio.sleep(0.05) # short network failure resolution time
                    duration = (time.perf_counter() - start) * 1000.0
                    error_count += 1
                    dropped_requests += 1
                    latencies.append(duration)
                else:
                    try:
                        response = await client.get(url, timeout=5.0)
                        duration = (time.perf_counter() - start) * 1000.0
                        if 200 <= response.status_code < 400:
                            success_count += 1
                        else:
                            error_count += 1
                        latencies.append(duration)
                    except Exception:
                        duration = (time.perf_counter() - start) * 1000.0
                        error_count += 1
                        latencies.append(duration)
                        
        total_requests = 10
        avg_response_time = sum(latencies) / len(latencies) if latencies else 0.0
        success_rate = (success_count / total_requests) * 100.0
        details = {
            "latencies": latencies,
            "packet_loss_pct": loss_pct,
            "dropped_count": dropped_requests
        }

    elif simulation_type == "retry":
        # Retry Simulation: Attempt -> Fail -> Backoff -> Attempt -> Success
        # We will run 1 sequential retry flow to show the step-by-step lifecycle.
        max_retries = config.get("max_retries", 3)
        attempts = []
        start_time = time.perf_counter()
        
        # We force-fail the first N attempts to showcase the retry mechanism.
        force_fail_count = config.get("force_fail_count", 2)
        
        async with httpx_AsyncClient_wrapper() as client:
            current_attempt = 1
            backoff_s = 0.5
            success = False
            
            while current_attempt <= max_retries + 1:
                attempt_start = time.perf_counter()
                
                # Apply backoff delay if not first attempt
                if current_attempt > 1:
                    # Exponential backoff
                    sleep_time = backoff_s * (2 ** (current_attempt - 2))
                    await asyncio.sleep(sleep_time)
                else:
                    sleep_time = 0
                
                attempt_details = {
                    "attempt": current_attempt,
                    "backoff_applied_s": sleep_time,
                }
                
                if current_attempt <= force_fail_count:
                    # Simulate failure (e.g. 503 Service Unavailable)
                    duration = (time.perf_counter() - attempt_start) * 1000.0
                    attempt_details.update({
                        "status": "failed",
                        "status_code": 503,
                        "error": "Service Unavailable (Simulated Chaos)",
                        "duration_ms": duration
                    })
                    attempts.append(attempt_details)
                    error_count += 1
                    current_attempt += 1
                else:
                    # Perform actual request
                    try:
                        response = await client.get(url, timeout=5.0)
                        duration = (time.perf_counter() - attempt_start) * 1000.0
                        
                        if 200 <= response.status_code < 400:
                            success = True
                            success_count += 1
                            attempt_details.update({
                                "status": "success",
                                "status_code": response.status_code,
                                "duration_ms": duration
                            })
                        else:
                            error_count += 1
                            attempt_details.update({
                                "status": "failed",
                                "status_code": response.status_code,
                                "duration_ms": duration
                            })
                    except Exception as e:
                        duration = (time.perf_counter() - attempt_start) * 1000.0
                        error_count += 1
                        attempt_details.update({
                            "status": "failed",
                            "error": str(e),
                            "duration_ms": duration
                        })
                    
                    attempts.append(attempt_details)
                    if success:
                        break
                    current_attempt += 1
        
        total_requests = len(attempts)
        avg_response_time = (time.perf_counter() - start_time) * 1000.0
        success_rate = 100.0 if success else 0.0
        details = {
            "attempts": attempts,
            "force_fail_count": force_fail_count,
            "retry_count": len(attempts) - 1 if success else len(attempts),
            "recovered": success
        }

    else:
        raise ValueError(f"Unknown simulation type: {simulation_type}")

    # Save to DB
    chaos_run = ChaosRun(
        url=url,
        simulation_type=simulation_type,
        config=config,
        success_rate_pct=success_rate,
        avg_response_time_ms=avg_response_time,
        error_count=error_count,
        total_requests=total_requests,
        details=details
    )
    
    db.add(chaos_run)
    db.commit()
    db.refresh(chaos_run)
    
    return chaos_run

# Helper helper to get httpx.AsyncClient
import httpx
from httpx import TimeoutException

def httpx_AsyncClient_wrapper():
    return httpx.AsyncClient(follow_redirects=True)
