from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import OCREngine
from .vlm import VLMEngine


class OCREngineManager:
    """
    Manages OCR engines with failover strategy (Cloud VLM Only):
    1. Primary VLM (DeepSeek, Grok)
    2. Backup VLMs (GPT-4o, Claude, etc.)
    """
    DEFAULT_PROVIDER_ORDER = [
        "deepseek",
        "grok",
        "openai",
        "anthropic",
        "google",
        "dashscope",
    ]
    DEFAULT_MODELS = {
        "deepseek": "deepseek-chat",
        "grok": "grok-2-vision-1212",
        "openai": "gpt-4o",
        "anthropic": "claude-3-5-sonnet-20240620",
        "google": "gemini-1.5-pro-latest",
        "dashscope": "qwen-vl-max",
    }

    def __init__(
        self,
        provider_priority: Optional[List[str]] = None,
        api_key_overrides: Optional[Dict[str, str]] = None,
    ):
        self.engines: List[OCREngine] = []
        self.provider_priority = provider_priority or []
        self.api_key_overrides = api_key_overrides or {}
        self._init_engines()

    def _init_engines(self):
        provider_order = self._resolve_provider_order()
        for provider in provider_order:
            model = self.DEFAULT_MODELS.get(provider)
            if not model:
                continue
            api_key = self.api_key_overrides.get(provider)
            self.engines.append(VLMEngine(provider=provider, model=model, api_key=api_key))

    def _resolve_provider_order(self) -> List[str]:
        if not self.provider_priority:
            return self.DEFAULT_PROVIDER_ORDER.copy()
        normalized = [provider for provider in self.provider_priority if provider in self.DEFAULT_PROVIDER_ORDER]
        remaining = [provider for provider in self.DEFAULT_PROVIDER_ORDER if provider not in normalized]
        return normalized + remaining

    async def process_document(
        self,
        image_paths: List[Path],
        text_content: Optional[str] = None,
        document_type: Optional[str] = None,
        language: str = "zh-TW",
    ) -> Dict[str, Any]:
        if not image_paths:
            raise ValueError("No images provided for OCR processing")

        errors = []
        for engine in self.engines:
            try:
                result = await engine.process(
                    image_paths[0],
                    text_content=text_content,
                    document_type=document_type,
                    language=language,
                )
                return {
                    "engine": engine.name,
                    "result": result,
                }
            except Exception as e:
                errors.append(f"{engine.name}: {str(e)}")

        raise RuntimeError(f"All OCR engines failed. Errors: {'; '.join(errors)}")

    async def check_services(self) -> Dict[str, Any]:
        statuses = {}
        for engine in self.engines:
            status = "available"
            if isinstance(engine, VLMEngine) and not engine.api_key:
                status = "missing_api_key"
            statuses[engine.name] = {"status": status}
        overall = "healthy" if any(s["status"] == "available" for s in statuses.values()) else "degraded"
        return {"overall": overall, "providers": statuses}
