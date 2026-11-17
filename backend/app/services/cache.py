import json
import logging
import ssl
import time
from redis.asyncio import Redis as AsyncRedis
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sliding Window Rate Limit — Lua Script
# ---------------------------------------------------------------------------
# Runs atomically on Redis (single-threaded Lua execution = no race conditions).
#
# Algorithm:
#   1. Remove all sorted-set members whose score (timestamp ms) is older than
#      the sliding window start  →  now_ms - window_ms
#   2. Count how many requests remain inside the window
#   3. If count >= limit  →  return 1  (blocked)
#   4. Otherwise add the current request as a new member with score = now_ms
#   5. Reset the key TTL to the window length so it auto-cleans
#   6. Return 0  (allowed)
#
# KEYS[1]  = sorted-set key  e.g. "rate_limit:127.0.0.1"
# ARGV[1]  = now_ms          current unix timestamp in milliseconds
# ARGV[2]  = window_ms       window length in milliseconds
# ARGV[3]  = limit           max requests allowed in window
# ARGV[4]  = unique_id       unique member id for this request (avoids ZADD collisions)
# ---------------------------------------------------------------------------
_SLIDING_WINDOW_LUA = """
local key        = KEYS[1]
local now_ms     = tonumber(ARGV[1])
local window_ms  = tonumber(ARGV[2])
local limit      = tonumber(ARGV[3])
local unique_id  = ARGV[4]

-- 1. Evict entries that have fallen outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, now_ms - window_ms)

-- 2. Count requests still inside the window
local count = redis.call('ZCARD', key)

-- 3. Reject if at or over limit
if count >= limit then
    return 1
end

-- 4. Record this request (member = unique_id, score = timestamp ms)
redis.call('ZADD', key, now_ms, unique_id)

-- 5. Keep the key alive for exactly one window length
redis.call('PEXPIRE', key, window_ms)

return 0
"""


class CacheService:
    """
    Async Redis cache + sliding-window rate limiter.

    Connection is lazy — the first await on any method establishes the
    connection and loads the Lua script SHA into Redis. If Redis is
    unavailable, every method silently returns a safe default so the
    application continues to function without caching or rate limiting.
    """

    def __init__(self) -> None:
        self._client: AsyncRedis | None = None
        self._script_sha: str | None = None
        self.enabled: bool = False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _connect(self) -> AsyncRedis | None:
        """Lazily create the async Redis client and register the Lua script."""
        if self._client is not None:
            return self._client
        try:
            redis_url = settings.redis_url

            # Build kwargs — add SSL context for rediss:// (TLS) URLs like Upstash
            kwargs: dict = {
                "socket_timeout": 2.0,
                "socket_connect_timeout": 2.0,
                "decode_responses": True,
            }
            if redis_url.startswith("rediss://"):
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
                kwargs["ssl_context"] = ssl_ctx

            self._client = AsyncRedis.from_url(redis_url, **kwargs)
            await self._client.ping()
            # Pre-load the Lua script so every call uses EVALSHA (faster)
            self._script_sha = await self._client.script_load(_SLIDING_WINDOW_LUA)
            self.enabled = True
            logger.info("Redis connected (async). Sliding-window Lua script loaded.")
        except Exception as exc:
            logger.warning(
                f"Redis unavailable at {settings.redis_url}. "
                f"Caching and rate limiting disabled. ({exc})"
            )
            self._client = None
            self.enabled = False
        return self._client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get(self, key: str) -> dict | None:
        """Return the cached JSON value for *key*, or None on miss/error."""
        client = await self._connect()
        if not client:
            return None
        try:
            raw = await client.get(key)
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.error(f"Redis GET '{key}' failed: {exc}")
            return None

    async def set(self, key: str, value: object, expire_seconds: int = 60) -> bool:
        """Serialise *value* as JSON and store it with a TTL of *expire_seconds*."""
        client = await self._connect()
        if not client:
            return False
        try:
            await client.setex(key, expire_seconds, json.dumps(value))
            return True
        except Exception as exc:
            logger.error(f"Redis SET '{key}' failed: {exc}")
            return False

    async def check_rate_limit(
        self,
        client_ip: str,
        limit: int = 30,
        window_seconds: int = 60,
    ) -> bool:
        """
        Sliding-window rate limiter backed by a Redis sorted set + Lua script.

        Returns:
            True  — request is over the limit and should be rejected (HTTP 429).
            False — request is within the limit and should be allowed through.
                    Also returns False when Redis is unavailable (fail-open).

        Unlike a fixed-window counter, the sliding window never allows a burst
        of `2 × limit` requests at a window boundary.  Every request is judged
        against the most recent `window_seconds` seconds of traffic from that IP.
        """
        client = await self._connect()
        if not client:
            return False  # fail-open: allow request when Redis is down

        try:
            key       = f"rate_limit:{client_ip}"
            now_ms    = int(time.time() * 1000)
            window_ms = window_seconds * 1000
            # Unique member prevents ZADD from silently deduplicating two
            # requests that arrive within the same millisecond.
            unique_id = f"{now_ms}:{id(object())}"

            if self._script_sha:
                result = await client.evalsha(
                    self._script_sha,
                    1,          # numkeys
                    key,        # KEYS[1]
                    now_ms,     # ARGV[1]
                    window_ms,  # ARGV[2]
                    limit,      # ARGV[3]
                    unique_id,  # ARGV[4]
                )
            else:
                # SHA not available (e.g. Redis SCRIPT FLUSH was called) — fall
                # back to inline eval and reload the SHA for next time.
                result = await client.eval(
                    _SLIDING_WINDOW_LUA, 1, key, now_ms, window_ms, limit, unique_id
                )
                self._script_sha = await client.script_load(_SLIDING_WINDOW_LUA)

            return bool(result)

        except Exception as exc:
            logger.error(f"Rate limit check failed for {client_ip}: {exc}")
            return False  # fail-open on error


cache_service = CacheService()
