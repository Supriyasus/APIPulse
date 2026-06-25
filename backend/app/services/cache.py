import redis
import json
import logging
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.enabled = False
        try:
            self.redis_client = redis.Redis.from_url(
                settings.redis_url, 
                socket_timeout=2.0, 
                decode_responses=True
            )
            self.redis_client.ping()
            self.enabled = True
            logger.info("Successfully connected to Redis.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis at {settings.redis_url}. Caching will be disabled. Error: {e}")
            self.redis_client = None
            self.enabled = False

    def get(self, key: str):
        if not self.enabled or not self.redis_client:
            return None
        try:
            val = self.redis_client.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            logger.error(f"Redis get key '{key}' failed: {e}")
            return None

    def set(self, key: str, value: any, expire_seconds: int = 60):
        if not self.enabled or not self.redis_client:
            return False
        try:
            serialized_value = json.dumps(value)
            self.redis_client.setex(key, expire_seconds, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Redis set key '{key}' failed: {e}")
            return False

    def check_rate_limit(self, client_ip: str, limit: int = 30, window_seconds: int = 60) -> bool:
        """
        Return True if request exceeds rate limit, False otherwise.
        Fallback to False if Redis is not active.
        """
        if not self.enabled or not self.redis_client:
            return False
        try:
            key = f"rate_limit:{client_ip}"
            current = self.redis_client.get(key)
            if current is not None:
                if int(current) >= limit:
                    return True
                self.redis_client.incr(key)
            else:
                # Setup transaction
                pipe = self.redis_client.pipeline()
                pipe.set(key, 1)
                pipe.expire(key, window_seconds)
                pipe.execute()
            return False
        except Exception as e:
            logger.error(f"Redis rate limiting operation failed: {e}")
            return False

cache_service = CacheService()
