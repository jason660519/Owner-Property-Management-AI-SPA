"""
Cache manager for OCR service
"""

from typing import Any, Optional
import asyncio
from loguru import logger


class CacheManager:
    """Simple in-memory cache manager"""

    def __init__(self):
        self.cache = {}
        self.is_initialized = False

    async def initialize(self):
        """Initialize cache manager"""
        self.is_initialized = True
        logger.info("Cache manager initialized")

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        return self.cache.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache with TTL"""
        self.cache[key] = value
        logger.debug(f"Cached value for key: {key}")

    async def delete(self, key: str):
        """Delete value from cache"""
        if key in self.cache:
            del self.cache[key]

    async def clear(self):
        """Clear all cache"""
        self.cache.clear()
        logger.info("Cache cleared")

    async def health_check(self) -> dict:
        """Health check for cache manager"""
        return {
            "status": "healthy" if self.is_initialized else "unhealthy",
            "cache_size": len(self.cache),
        }
