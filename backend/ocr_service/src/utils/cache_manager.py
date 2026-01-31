"""
Cache manager for OCR results optimization
"""
import hashlib
import json
import pickle
from typing import Dict, Any, Optional
import asyncio
import aioredis
from loguru import logger

class CacheManager:
    def __init__(self, redis_url: Optional[str] = None, max_memory_mb: int = 100):
        self.redis_url = redis_url or "redis://localhost:6379"
        self.max_memory_mb = max_memory_mb
        self.redis_client = None
        self.memory_cache = {}
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize cache manager"""
        if self.is_initialized:
            return
        
        try:
            # Try to connect to Redis
            try:
                self.redis_client = await aioredis.from_url(
                    self.redis_url, 
                    encoding="utf-8", 
                    decode_responses=False
                )
                # Test connection
                await self.redis_client.ping()
                logger.info("Cache manager initialized with Redis")
            except Exception as redis_error:
                logger.warning(f"Redis not available, using in-memory cache: {redis_error}")
                self.redis_client = None
            
            self.is_initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize cache manager: {e}")
            raise
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if self.redis_client:
                # Try Redis first
                cached_data = await self.redis_client.get(key)
                if cached_data:
                    return pickle.loads(cached_data)
            
            # Fall back to memory cache
            return self.memory_cache.get(key)
            
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            serialized_value = pickle.dumps(value)
            
            if self.redis_client:
                # Use Redis
                await self.redis_client.set(key, serialized_value, ex=ttl)
            else:
                # Use memory cache with LRU eviction
                self.memory_cache[key] = value
                await self._clean_memory_cache()
            
            return True
            
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            if self.redis_client:
                await self.redis_client.delete(key)
            
            if key in self.memory_cache:
                del self.memory_cache[key]
            
            return True
            
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """Clear all cache"""
        try:
            if self.redis_client:
                await self.redis_client.flushdb()
            
            self.memory_cache.clear()
            
            return True
            
        except Exception as e:
            logger.warning(f"Cache clear failed: {e}")
            return False
    
    async def generate_key(
        self, 
        content: bytes, 
        document_type: str, 
        language: str,
        processing_config: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate cache key based on content and parameters"""
        try:
            # Create hash of content
            content_hash = hashlib.md5(content).hexdigest()
            
            # Include processing parameters
            config_str = json.dumps(processing_config or {}, sort_keys=True)
            
            key_parts = [
                "ocr",
                document_type,
                language,
                content_hash,
                hashlib.md5(config_str.encode()).hexdigest()[:8]
            ]
            
            return ":".join(key_parts)
            
        except Exception as e:
            logger.warning(f"Cache key generation failed: {e}")
            # Fallback key
            return f"ocr:{document_type}:{language}:{hashlib.md5(content).hexdigest()}"
    
    async def _clean_memory_cache(self):
        """Clean memory cache based on size limits"""
        if not self.memory_cache:
            return
        
        # Calculate current memory usage
        current_size = sum(
            len(pickle.dumps(value)) for value in self.memory_cache.values()
        ) / (1024 * 1024)  # Convert to MB
        
        if current_size > self.max_memory_mb:
            # Remove oldest items (simple LRU)
            items_to_remove = int(len(self.memory_cache) * 0.2)  # Remove 20%
            
            # Sort by access time (simplified - remove arbitrary items)
            keys_to_remove = list(self.memory_cache.keys())[:items_to_remove]
            
            for key in keys_to_remove:
                del self.memory_cache[key]
            
            logger.info(f"Cleaned memory cache, removed {items_to_remove} items")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            stats = {
                'cache_type': 'redis' if self.redis_client else 'memory',
                'memory_cache_size': len(self.memory_cache),
                'max_memory_mb': self.max_memory_mb
            }
            
            if self.redis_client:
                try:
                    redis_info = await self.redis_client.info()
                    stats.update({
                        'redis_used_memory': redis_info.get('used_memory', 0),
                        'redis_keys': redis_info.get('db0', {}).get('keys', 0),
                        'redis_connected_clients': redis_info.get('connected_clients', 0)
                    })
                except Exception:
                    stats['redis_info'] = 'unavailable'
            
            return stats
            
        except Exception as e:
            logger.warning(f"Cache stats failed: {e}")
            return {'error': str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Test cache operations
            test_key = "health_check"
            test_value = {"timestamp": "test", "status": "healthy"}
            
            # Set test value
            set_success = await self.set(test_key, test_value, ttl=10)
            
            # Get test value
            retrieved_value = await self.get(test_key)
            
            # Delete test value
            delete_success = await self.delete(test_key)
            
            stats = await self.get_stats()
            
            if set_success and retrieved_value == test_value and delete_success:
                return {
                    'status': 'healthy',
                    'message': 'Cache manager functioning normally',
                    'stats': stats
                }
            else:
                return {
                    'status': 'degraded',
                    'message': 'Cache manager basic operations completed with issues',
                    'stats': stats
                }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Cache manager error: {e}'
            }
    
    async def close(self):
        """Close cache connections"""
        try:
            if self.redis_client:
                await self.redis_client.close()
        except Exception as e:
            logger.warning(f"Error closing cache connections: {e}")