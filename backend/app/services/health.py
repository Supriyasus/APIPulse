import socket
import ssl
import time
from datetime import datetime, timezone
from urllib.parse import urlparse
import httpx
from sqlalchemy.orm import Session
from app.models.models import ApiTest

def check_ssl(url: str) -> tuple[bool, datetime | None]:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        return False, None
    
    hostname = parsed.hostname
    if not hostname:
        return False, None
        
    context = ssl.create_default_context()
    try:
        # Create connection with short timeout to avoid hanging
        with socket.create_connection((hostname, 443), timeout=4.0) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    return False, None
                
                expire_str = cert.get('notAfter')
                if not expire_str:
                    return False, None
                
                # Format: 'May  9 12:00:00 2024 GMT'
                expire_dt = datetime.strptime(expire_str, '%b %d %H:%M:%S %Y %Z')
                # Make it timezone-aware to match DB or frontend ISO strings
                expire_dt = expire_dt.replace(tzinfo=timezone.utc)
                is_valid = expire_dt > datetime.now(timezone.utc)
                return is_valid, expire_dt
    except Exception as e:
        print(f"SSL check error for {hostname}: {e}")
        return False, None

async def run_health_check(url: str, db: Session) -> ApiTest:
    # Ensure URL starts with scheme
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    ssl_valid, ssl_expiry = check_ssl(url)
    
    headers_dict = {}
    status_code = None
    response_time = None
    response_size = None
    content_type = None

    start_time = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            end_time = time.perf_counter()
            response_time = (end_time - start_time) * 1000.0 # ms
            status_code = response.status_code
            response_size = len(response.content)
            content_type = response.headers.get("content-type", "unknown")
            # Store some key headers or all headers (converting list values to string if any)
            headers_dict = {k: v for k, v in response.headers.items()}
    except httpx.RequestError as e:
        end_time = time.perf_counter()
        response_time = (end_time - start_time) * 1000.0
        status_code = 0
        content_type = "connection-error"
        headers_dict = {"error": str(e)}
        print(f"HTTP check error for {url}: {e}")

    # Save to database
    api_test = ApiTest(
        url=url,
        status_code=status_code,
        ssl_valid=ssl_valid,
        ssl_expiry=ssl_expiry,
        response_time_ms=response_time,
        response_size=response_size,
        content_type=content_type,
        headers=headers_dict
    )
    
    db.add(api_test)
    db.commit()
    db.refresh(api_test)
    
    return api_test
