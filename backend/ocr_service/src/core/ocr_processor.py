"""
Main OCR processor coordinating all processing stages
"""

import asyncio
import hashlib
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from loguru import logger
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ..layout.layout_analyzer import LayoutAnalyzer
from ..layout.table_detector import TableDetector
from ..models.schemas import DocumentType, ProcessingConfig
from ..ocr.text_detector import TextDetector
from ..ocr.text_recognizer import TextRecognizer
from ..ocr_engine.manager import OCREngineManager
from ..preprocessor.image_preprocessor import ImagePreprocessor
from ..preprocessor.pdf_preprocessor import PDFPreprocessor
from ..utils.cache_manager import CacheManager


class OCRProcessor:
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.pdf_preprocessor = PDFPreprocessor()
        self.text_detector = TextDetector()
        self.text_recognizer = TextRecognizer()
        self.layout_analyzer = LayoutAnalyzer()
        self.table_detector = TableDetector()
        self.ocr_engine_manager = OCREngineManager()
        self.cache_manager = CacheManager()
        self.is_initialized = False

    async def initialize(self):
        """Initialize all components"""
        if self.is_initialized:
            return

        logger.info("Initializing OCR processor components...")

        # Initialize components in parallel
        await asyncio.gather(
            self.preprocessor.initialize(),
            self.pdf_preprocessor.initialize(),
            self.text_detector.initialize(),
            self.text_recognizer.initialize(),
            self.layout_analyzer.initialize(),
            self.table_detector.initialize(),
            self.cache_manager.initialize(),
        )

        self.is_initialized = True
        logger.info("OCR processor initialized successfully")

    async def shutdown(self):
        """Cleanup resources"""
        logger.info("Shutting down OCR processor...")
        await self.cache_manager.close()
        self.is_initialized = False

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True,
    )
    async def process_document(
        self,
        content: bytes,
        filename: str,
        document_type: DocumentType = DocumentType.BUILDING_TITLE,
        language: str = "zh-TW",
        request_id: Optional[str] = None,
        config: Optional[ProcessingConfig] = None,
    ) -> Dict[str, Any]:
        """
        Main document processing pipeline
        """
        if not self.is_initialized:
            await self.initialize()

        config = config or ProcessingConfig()
        request_id = request_id or f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        logger.info(f"Processing document {filename} (ID: {request_id})")

        try:
            # Step 1: Preprocessing based on file type
            if filename.lower().endswith(".pdf"):
                processed_images = await self._process_pdf(content, config)
            else:
                processed_images = await self._process_image(content, config)

            if not processed_images:
                raise ValueError(f"No content extracted from document {filename}")

            # Step 2: Text detection and recognition
            text_results = []
            for img_idx, image in enumerate(processed_images):
                text_blocks = await self.text_detector.detect(image)
                recognized_text = await self.text_recognizer.recognize(image, text_blocks, language)
                text_results.append({"page": img_idx + 1, "text_blocks": recognized_text})

            # Step 3: Layout analysis
            layout_analysis = await self.layout_analyzer.analyze(processed_images[0])

            # Step 4: Table detection (if enabled)
            tables = []
            if config and config.enable_table_detection:
                tables = await self.table_detector.detect_tables(processed_images)

            text_content = self._build_text_content(text_results)

            with tempfile.TemporaryDirectory() as temp_dir:
                image_paths = []
                for img_idx, image in enumerate(processed_images):
                    image_path = Path(temp_dir) / f"page_{img_idx + 1}.png"
                    with open(image_path, "wb") as output_file:
                        output_file.write(image)
                    image_paths.append(image_path)

                vlm_result = await self.ocr_engine_manager.process_document(
                    image_paths=image_paths,
                    text_content=text_content,
                    document_type=document_type.value,
                    language=language,
                )

            # Step 6: Compile final result
            final_result = self._compile_result(
                vlm_result=vlm_result,
                text_results=text_results,
                layout_analysis=layout_analysis,
                tables=tables,
                document_type=document_type,
                config=config,
            )

            logger.info(f"Document processing completed for {request_id}")
            return final_result

        except Exception as e:
            logger.error(f"Error processing document {request_id}: {e}")
            raise

    async def _process_pdf(self, content: bytes, config: ProcessingConfig) -> List:
        """Process PDF document"""
        try:
            # Extract pages from PDF
            pages = await self.pdf_preprocessor.extract_pages(content)

            # Process each page image
            processed_pages = []
            for page in pages:
                if isinstance(page, dict) and "image_data" in page:
                    image_data = page["image_data"]
                elif isinstance(page, (bytes, bytearray)):
                    image_data = page
                else:
                    continue

                # Ensure image_data is bytes
                if isinstance(image_data, bytes):
                    processed_image_data = image_data
                else:
                    # Convert other types to bytes if needed
                    processed_image_data = (
                        bytes(image_data) if hasattr(image_data, "__bytes__") else image_data
                    )

                cache_key = self._get_preprocess_cache_key(processed_image_data, config)
                cached_image = await self.cache_manager.get(cache_key)
                if cached_image:
                    processed_pages.append(cached_image)
                    continue

                processed = await self.preprocessor.preprocess(
                    processed_image_data,
                    enhance_quality=config.enhance_quality if config else True,
                    remove_noise=config.remove_noise if config else True,
                )
                await self.cache_manager.set(cache_key, processed, ttl=3600)
                processed_pages.append(processed)

            return processed_pages
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise

    async def _process_image(self, content: bytes, config: ProcessingConfig) -> List:
        """Process single image"""
        cache_key = self._get_preprocess_cache_key(content, config)
        cached_image = await self.cache_manager.get(cache_key)
        if cached_image:
            return [cached_image]

        processed_image = await self.preprocessor.preprocess(
            content,
            enhance_quality=config.enhance_quality if config else True,
            remove_noise=config.remove_noise if config else True,
            resize_to=getattr(config, "target_size", None) if config else None,
        )
        await self.cache_manager.set(cache_key, processed_image, ttl=3600)
        return [processed_image]

    def _get_preprocess_cache_key(self, content: bytes, config: ProcessingConfig) -> str:
        config_payload = config.dict() if config else {}
        digest = hashlib.sha256(content).hexdigest()
        config_digest = hashlib.sha256(str(config_payload).encode("utf-8")).hexdigest()
        return f"preprocess:{digest}:{config_digest}"

    def _build_text_content(self, text_results: List[Dict]) -> str:
        lines = []
        for page in text_results:
            for block in page.get("text_blocks", []):
                text = block.get("text")
                if text:
                    lines.append(text)
        return "\n".join(lines)

    def _compile_result(
        self,
        vlm_result: Dict[str, Any],
        text_results: List[Dict],
        layout_analysis: Dict,
        tables: List[Dict],
        document_type: DocumentType,
        config: ProcessingConfig,
    ) -> Dict[str, Any]:
        """Compile final processing result"""
        return {
            "document_type": document_type.value,
            "vlm_analysis": vlm_result,
            "raw_text": text_results,
            "layout_analysis": layout_analysis,
            "tables": tables,
            "processing_config": config.dict() if config else {},
            "confidence_score": self._calculate_confidence(vlm_result, text_results),
            "timestamp": datetime.now().isoformat(),
        }

    def _calculate_confidence(self, vlm_result: Dict, text_results: List[Dict]) -> float:
        """Calculate overall confidence score"""
        # Simple confidence calculation based on text extraction quality
        total_blocks = sum(len(page["text_blocks"]) for page in text_results)
        if total_blocks == 0:
            return 0.0

        # Higher confidence if VLM result contains structured data
        vlm_confidence = 0.7 if vlm_result and any(vlm_result.values()) else 0.3

        return min(0.95, vlm_confidence + 0.1)  # Cap at 0.95

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        try:
            checks = {
                "preprocessor": await self.preprocessor.health_check(),
                "text_detector": await self.text_detector.health_check(),
                "text_recognizer": await self.text_recognizer.health_check(),
                "cache_manager": await self.cache_manager.health_check(),
            }

            all_healthy = all(check.get("status") == "healthy" for check in checks.values())

            return {"status": "healthy" if all_healthy else "degraded", "components": checks}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    async def check_vlm_services(self) -> Dict[str, Any]:
        """Check status of VLM services"""
        return await self.ocr_engine_manager.check_services()

    async def is_ready(self) -> bool:
        """Check if processor is ready for requests"""
        try:
            health = await self.health_check()
            return health.get("status") == "healthy"
        except Exception:
            return False
