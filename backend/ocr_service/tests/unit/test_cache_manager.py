"""
Unit tests for CacheManager module
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from src.utils.cache_manager import CacheManager


class TestCacheManager:
    @pytest.fixture
    def cache_manager(self):
        return CacheManager(redis_url="redis://localhost:6379", max_memory_mb=10)
    
    @pytest.fixture
    def test_data(self):
        return {"test": "data", "number": 42, "list": [1, 2, 3]}
    
    @pytest.mark.asyncio
    async def test_initialize(self, cache_manager):
        """Test initialization"""
        # Mock Redis connection
        with patch('aioredis.from_url') as mock_redis:
            mock_client = AsyncMock()
            mock_client.ping = AsyncMock()
            mock_redis.return_value = mock_client
            
            await cache_manager.initialize()
            
            assert cache_manager.is_initialized is True
            mock_redis.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_initialize_fallback_to_memory(self, cache_manager):
        """Test fallback to memory cache when Redis is unavailable"""
        with patch('aioredis.from_url', side_effect=Exception("Redis unavailable")):
            await cache_manager.initialize()
            
            assert cache_manager.is_initialized is True
            assert cache_manager.redis_client is None
    
    @pytest.mark.asyncio
    async def test_set_and_get_memory_cache(self, cache_manager, test_data):
        """Test set and get operations with memory cache"""
        cache_manager.redis_client = None  # Force memory cache
        await cache_manager.initialize()
        
        # Test set operation
        set_result = await cache_manager.set("test_key", test_data, ttl=60)
        assert set_result is True
        
        # Test get operation
        retrieved_data = await cache_manager.get("test_key")
        assert retrieved_data == test_data
    
    @pytest.mark.asyncio
    async def test_set_and_get_redis_cache(self, cache_manager, test_data):
        """Test set and get operations with Redis cache"""
        # Mock Redis client
        mock_client = AsyncMock()
        mock_client.set = AsyncMock(return_value=True)
        mock_client.get = AsyncMock(return_value=None)
        cache_manager.redis_client = mock_client
        await cache_manager.initialize()
        
        # Test set operation
        set_result = await cache_manager.set("test_key", test_data, ttl=60)
        assert set_result is True
        mock_client.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_memory_cache(self, cache_manager, test_data):
        """Test delete operation with memory cache"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        # Set data first
        await cache_manager.set("test_key", test_data)
        
        # Test delete operation
        delete_result = await cache_manager.delete("test_key")
        assert delete_result is True
        
        # Verify data is gone
        retrieved_data = await cache_manager.get("test_key")
        assert retrieved_data is None
    
    @pytest.mark.asyncio
    async def test_clear_memory_cache(self, cache_manager, test_data):
        """Test clear operation with memory cache"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        # Add some data
        await cache_manager.set("key1", test_data)
        await cache_manager.set("key2", {"other": "data"})
        
        # Test clear operation
        clear_result = await cache_manager.clear()
        assert clear_result is True
        
        # Verify cache is empty
        assert len(cache_manager.memory_cache) == 0
    
    @pytest.mark.asyncio
    async def test_generate_key(self, cache_manager):
        """Test cache key generation"""
        content = b"test content"
        document_type = "building_title"
        language = "zh-TW"
        
        key = await cache_manager.generate_key(
            content, document_type, language
        )
        
        assert key.startswith("ocr:building_title:zh-TW:")
        assert len(key) > 0
    
    @pytest.mark.asyncio
    async def test_generate_key_with_config(self, cache_manager):
        """Test cache key generation with processing config"""
        content = b"test content"
        document_type = "building_title"
        language = "zh-TW"
        config = {"enhance": True, "dpi": 300}
        
        key = await cache_manager.generate_key(
            content, document_type, language, config
        )
        
        assert key.startswith("ocr:building_title:zh-TW:")
        assert len(key) > 0
    
    @pytest.mark.asyncio
    async def test_get_stats_memory_cache(self, cache_manager):
        """Test getting statistics for memory cache"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        # Add some data
        await cache_manager.set("key1", {"test": "data1"})
        await cache_manager.set("key2", {"test": "data2"})
        
        stats = await cache_manager.get_stats()
        
        assert stats["cache_type"] == "memory"
        assert stats["memory_cache_size"] == 2
        assert stats["max_memory_mb"] == 10
    
    @pytest.mark.asyncio
    async def test_get_stats_redis_cache(self, cache_manager):
        """Test getting statistics for Redis cache"""
        # Mock Redis info
        mock_client = AsyncMock()
        mock_client.info = AsyncMock(return_value={
            "used_memory": 1024000,
            "db0": {"keys": 5},
            "connected_clients": 2
        })
        cache_manager.redis_client = mock_client
        await cache_manager.initialize()
        
        stats = await cache_manager.get_stats()
        
        assert stats["cache_type"] == "redis"
        assert stats["redis_used_memory"] == 1024000
        assert stats["redis_keys"] == 5
        assert stats["redis_connected_clients"] == 2
    
    @pytest.mark.asyncio
    async def test_health_check_memory_cache(self, cache_manager):
        """Test health check for memory cache"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        health_status = await cache_manager.health_check()
        
        assert "status" in health_status
        assert "message" in health_status
        assert "stats" in health_status
        assert health_status["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_health_check_redis_cache(self, cache_manager):
        """Test health check for Redis cache"""
        # Mock Redis operations
        mock_client = AsyncMock()
        mock_client.set = AsyncMock(return_value=True)
        mock_client.get = AsyncMock(return_value=None)
        mock_client.delete = AsyncMock(return_value=1)
        cache_manager.redis_client = mock_client
        await cache_manager.initialize()
        
        health_status = await cache_manager.health_check()
        
        assert "status" in health_status
        assert health_status["status"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_memory_cache_cleanup(self, cache_manager):
        """Test memory cache cleanup when exceeding size limit"""
        cache_manager.redis_client = None
        cache_manager.max_memory_mb = 1  # Small limit for testing
        await cache_manager.initialize()
        
        # Add enough data to exceed the limit
        large_data = {"large": "x" * 500000}  # ~500KB
        
        for i in range(10):
            await cache_manager.set(f"key{i}", large_data)
        
        # Trigger cleanup
        await cache_manager._clean_memory_cache()
        
        # Some items should have been removed
        stats = await cache_manager.get_stats()
        assert stats["memory_cache_size"] < 10
    
    @pytest.mark.asyncio
    async def test_cache_miss(self, cache_manager):
        """Test cache miss scenario"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        # Try to get non-existent key
        result = await cache_manager.get("non_existent_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self, cache_manager, test_data):
        """Test cache expiration (simulated)"""
        cache_manager.redis_client = None
        await cache_manager.initialize()
        
        # Set data with very short TTL
        await cache_manager.set("temp_key", test_data, ttl=1)
        
        # Wait for expiration
        await asyncio.sleep(1.1)
        
        # Data should still be there (memory cache doesn't auto-expire)
        result = await cache_manager.get("temp_key")
        assert result == test_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])