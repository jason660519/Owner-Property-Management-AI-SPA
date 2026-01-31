import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
from loguru import logger
from .base import OCREngine
from .vlm import VLMEngine

class OCREngineManager:
    """
    Manages OCR engines with failover strategy (Cloud VLM Only):
    1. Primary VLM (DeepSeek, Grok)
    2. Backup VLMs (GPT-4o, Claude, etc.)
    """
    def __init__(self):
        self.engines: List[OCREngine] = []
        self._init_engines()

    def _init_engines(self):
        # 1. Primary: Cost-effective & Vision Capable Models
        # DeepSeek V3 (OpenAI Compatible) - Strong Chinese, low cost
        self.engines.append(VLMEngine(provider="deepseek", model="deepseek-chat"))
        
        # Grok (xAI) - Strong vision capabilities
        self.engines.append(VLMEngine(provider="grok", model="grok-2-vision-1212"))

        # 2. Backups: High-performance Global Models
        self.engines.append(VLMEngine(provider="openai", model="gpt-4o"))
        self.engines.append(VLMEngine(provider="anthropic", model="claude-3-5-sonnet-20240620"))
        self.engines.append(VLMEngine(provider="google", model="gemini-1.5-pro-latest"))
        self.engines.append(VLMEngine(provider="dashscope", model="qwen-vl-max"))

    async def process_document(self, image_path: Path) -> Dict[str, Any]:
        """
        Try engines in order until one succeeds.
        """
        errors = []
        
        for engine in self.engines:
            try:
                # Check if we should skip (e.g., no API key)
                if isinstance(engine, VLMEngine) and not engine.api_key:
                    logger.debug(f"Skipping {engine.name} (No API Key)")
                    continue

                logger.info(f"Attempting processing with {engine.name}")
                result = await engine.process(image_path)
                
                # Basic validation
                if result:
                    logger.success(f"Successfully processed with {engine.name}")
                    
                    # Inject metadata
                    if "metadata" not in result:
                        result["metadata"] = {}
                    
                    result["metadata"].update({
                        "ocr_engine": engine.name,
                        "processed_at": datetime.now().isoformat(),
                    })
                    
                    return result
                    
            except Exception as e:
                logger.warning(f"Engine {engine.name} failed: {e}")
                errors.append(f"{engine.name}: {str(e)}")
                continue
        
        error_msg = f"All OCR engines failed. Errors: {'; '.join(errors)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
