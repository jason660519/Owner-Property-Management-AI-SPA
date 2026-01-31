"""
Metrics collector for performance monitoring and analytics
"""
import time
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict, deque
from loguru import logger

class MetricsCollector:
    def __init__(self, retention_period_hours: int = 24):
        self.retention_period = retention_period_hours
        self.metrics = defaultdict(lambda: defaultdict(list))
        self.timestamps = deque()
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize metrics collector"""
        if self.is_initialized:
            return
        
        try:
            # Start background cleanup task
            asyncio.create_task(self._cleanup_task())
            self.is_initialized = True
            logger.info("Metrics collector initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize metrics collector: {e}")
            raise
    
    async def record(
        self, 
        metric_name: str, 
        value: float, 
        tags: Optional[Dict[str, str]] = None,
        timestamp: Optional[datetime] = None
    ):
        """Record a metric value"""
        try:
            ts = timestamp or datetime.now()
            key = self._get_metric_key(metric_name, tags)
            
            self.metrics[key]['values'].append((ts, value))
            self.timestamps.append(ts)
            
            # Update statistics
            self._update_statistics(key, value)
            
        except Exception as e:
            logger.warning(f"Failed to record metric {metric_name}: {e}")
    
    async def increment(
        self, 
        metric_name: str, 
        value: int = 1, 
        tags: Optional[Dict[str, str]] = None
    ):
        """Increment a counter metric"""
        await self.record(metric_name, value, tags)
    
    async def timing(
        self, 
        metric_name: str, 
        duration_ms: float, 
        tags: Optional[Dict[str, str]] = None
    ):
        """Record timing metric"""
        await self.record(metric_name, duration_ms, tags)
    
    async def start_timer(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> str:
        """Start a timer and return timer ID"""
        timer_id = f"{metric_name}_{time.time_ns()}"
        self.metrics[timer_id] = {
            'start_time': time.time(),
            'metric_name': metric_name,
            'tags': tags or {}
        }
        return timer_id
    
    async def stop_timer(self, timer_id: str) -> Optional[float]:
        """Stop timer and record duration"""
        try:
            timer_data = self.metrics.get(timer_id)
            if not timer_data:
                return None
            
            duration_ms = (time.time() - timer_data['start_time']) * 1000
            await self.timing(timer_data['metric_name'], duration_ms, timer_data['tags'])
            
            # Remove timer data
            if timer_id in self.metrics:
                del self.metrics[timer_id]
            
            return duration_ms
            
        except Exception as e:
            logger.warning(f"Failed to stop timer {timer_id}: {e}")
            return None
    
    async def get_metrics(
        self, 
        metric_name: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        time_window_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get metrics with optional filtering"""
        try:
            results = {}
            
            if metric_name:
                key = self._get_metric_key(metric_name, tags)
                if key in self.metrics:
                    results[key] = self._filter_metrics(self.metrics[key], time_window_minutes)
            else:
                # Get all metrics
                for key, metric_data in self.metrics.items():
                    if 'values' in metric_data:  # Only include actual metrics, not timers
                        filtered_data = self._filter_metrics(metric_data, time_window_minutes)
                        if filtered_data['values']:
                            results[key] = filtered_data
            
            return results
            
        except Exception as e:
            logger.warning(f"Failed to get metrics: {e}")
            return {}
    
    async def get_statistics(
        self, 
        metric_name: str,
        tags: Optional[Dict[str, str]] = None,
        time_window_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get statistical summary for a metric"""
        try:
            key = self._get_metric_key(metric_name, tags)
            if key not in self.metrics:
                return {}
            
            metric_data = self.metrics[key]
            filtered_data = self._filter_metrics(metric_data, time_window_minutes)
            
            if not filtered_data['values']:
                return {}
            
            values = [value for _, value in filtered_data['values']]
            
            return {
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'mean': sum(values) / len(values),
                'p95': self._percentile(values, 95),
                'p99': self._percentile(values, 99),
                'last_updated': filtered_data['values'][-1][0] if filtered_data['values'] else None
            }
            
        except Exception as e:
            logger.warning(f"Failed to get statistics: {e}")
            return {}
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get system-wide metrics summary"""
        try:
            # Calculate overall statistics
            total_requests = 0
            success_rate = 0.0
            avg_processing_time = 0.0
            cache_hit_rate = 0.0
            
            # Get request metrics
            request_stats = await self.get_statistics('ocr_processing_time')
            if request_stats:
                total_requests = request_stats['count']
                avg_processing_time = request_stats['mean']
            
            # Get success rate
            success_stats = await self.get_statistics('ocr_success')
            error_stats = await self.get_statistics('ocr_error')
            
            if success_stats and error_stats:
                total_operations = success_stats['count'] + error_stats['count']
                if total_operations > 0:
                    success_rate = success_stats['count'] / total_operations
            
            # Get cache metrics
            cache_hit_stats = await self.get_statistics('cache_hit')
            cache_miss_stats = await self.get_statistics('cache_miss')
            
            if cache_hit_stats and cache_miss_stats:
                total_cache_ops = cache_hit_stats['count'] + cache_miss_stats['count']
                if total_cache_ops > 0:
                    cache_hit_rate = cache_hit_stats['count'] / total_cache_ops
            
            return {
                'total_requests': total_requests,
                'success_rate': round(success_rate * 100, 2),
                'avg_processing_time_ms': round(avg_processing_time, 2),
                'cache_hit_rate': round(cache_hit_rate * 100, 2),
                'metrics_retention_hours': self.retention_period,
                'total_metrics_tracked': len([k for k in self.metrics.keys() if 'values' in self.metrics[k]])
            }
            
        except Exception as e:
            logger.warning(f"Failed to get system metrics: {e}")
            return {}
    
    def _get_metric_key(self, metric_name: str, tags: Optional[Dict[str, str]]) -> str:
        """Generate metric key from name and tags"""
        if not tags:
            return metric_name
        
        sorted_tags = sorted(tags.items())
        tag_str = '_'.join(f"{k}_{v}" for k, v in sorted_tags)
        return f"{metric_name}_{tag_str}"
    
    def _filter_metrics(
        self, 
        metric_data: Dict[str, Any], 
        time_window_minutes: Optional[int]
    ) -> Dict[str, Any]:
        """Filter metrics by time window"""
        if not time_window_minutes:
            return metric_data.copy()
        
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        filtered_values = [
            (ts, value) for ts, value in metric_data['values'] 
            if ts >= cutoff_time
        ]
        
        result = metric_data.copy()
        result['values'] = filtered_values
        
        # Recalculate statistics for filtered data
        if filtered_values:
            values = [value for _, value in filtered_values]
            result['stats'] = {
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'mean': sum(values) / len(values)
            }
        
        return result
    
    def _update_statistics(self, key: str, value: float):
        """Update running statistics for a metric"""
        if 'stats' not in self.metrics[key]:
            self.metrics[key]['stats'] = {
                'count': 0,
                'sum': 0.0,
                'min': float('inf'),
                'max': float('-inf'),
                'last_value': None
            }
        
        stats = self.metrics[key]['stats']
        stats['count'] += 1
        stats['sum'] += value
        stats['min'] = min(stats['min'], value)
        stats['max'] = max(stats['max'], value)
        stats['last_value'] = value
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = (len(sorted_values) - 1) * percentile / 100
        lower_index = int(index)
        upper_index = lower_index + 1
        
        if upper_index >= len(sorted_values):
            return sorted_values[lower_index]
        
        weight = index - lower_index
        return sorted_values[lower_index] * (1 - weight) + sorted_values[upper_index] * weight
    
    async def _cleanup_task(self):
        """Background task to clean up old metrics"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._cleanup_old_metrics()
            except Exception as e:
                logger.warning(f"Metrics cleanup task failed: {e}")
    
    async def _cleanup_old_metrics(self):
        """Remove metrics older than retention period"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=self.retention_period)
            
            # Clean timestamps
            while self.timestamps and self.timestamps[0] < cutoff_time:
                self.timestamps.popleft()
            
            # Clean metrics
            keys_to_remove = []
            for key, metric_data in self.metrics.items():
                if 'values' in metric_data:
                    # Remove old values
                    metric_data['values'] = [
                        (ts, value) for ts, value in metric_data['values'] 
                        if ts >= cutoff_time
                    ]
                    
                    # Remove empty metrics
                    if not metric_data['values']:
                        keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.metrics[key]
            
            logger.info(f"Metrics cleanup completed, removed {len(keys_to_remove)} empty metrics")
            
        except Exception as e:
            logger.warning(f"Metrics cleanup failed: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            system_metrics = await self.get_system_metrics()
            
            return {
                'status': 'healthy',
                'message': 'Metrics collector functioning normally',
                'system_metrics': system_metrics
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Metrics collector error: {e}'
            }