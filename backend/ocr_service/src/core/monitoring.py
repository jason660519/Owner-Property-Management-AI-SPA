"""
Metrics collector for OCR service monitoring
"""

from typing import Any, Dict

from loguru import logger


class MetricsCollector:
    """Simple metrics collector"""

    def __init__(self):
        self.metrics = {}
        self.is_initialized = False

    async def initialize(self):
        """Initialize metrics collector"""
        self.is_initialized = True
        logger.info("Metrics collector initialized")

    async def increment_counter(self, metric_name: str, value: int = 1):
        """Increment counter metric"""
        if metric_name not in self.metrics:
            self.metrics[metric_name] = {"type": "counter", "value": 0}
        self.metrics[metric_name]["value"] += value

    async def record_timing(self, metric_name: str, duration_ms: float):
        """Record timing metric"""
        if metric_name not in self.metrics:
            self.metrics[metric_name] = {"type": "timing", "value": []}
        self.metrics[metric_name]["value"].append(duration_ms)

    async def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics"""
        return self.metrics

    async def health_check(self) -> dict:
        """Health check for metrics collector"""
        return {
            "status": "healthy" if self.is_initialized else "unhealthy",
            "metrics_count": len(self.metrics),
        }
