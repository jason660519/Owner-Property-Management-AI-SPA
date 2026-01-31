"""
Main OCR processor coordinating all processing stages
"""
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path
import tempfile
import json
from datetime import datetime

from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..preprocessor.image_preprocessor import ImagePreprocessor
from ..preprocessor.pdf_preprocessor import PDFPreprocessor
from ..ocr.text_detector import TextDetector
from ..ocr.text_recognizer import TextRecognizer
from ..layout.layout_analyzer import LayoutAnalyzer
from ..layout.table_detector import TableDetector
from ..vlm.vlm_engine import VLMEngine
from ..models.schemas import DocumentType, ProcessingConfig

class OCRProcessor:
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.pdf_preprocessor = PDFPreprocessor()
        self.text_detector = TextDetector()
        self.text_recognizer = TextRecognizer()
        self.layout_analyzer = LayoutAnalyzer()
        self.table_detector = TableDetector()
        self.vlm_engine = VLMEngine()
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
            self.vlm_engine.initialize()
        )
        
        self.is_initialized = True
        logger.info("OCR processor initialized successfully")
    
    async def shutdown(self):
        """Cleanup resources"""
        logger.info("Shutting down OCR processor...")
        self.is_initialized = False
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        reraise=True
    )
    async def process_document(
        self,
        content: bytes,
        filename: str,
        document_type: DocumentType = DocumentType.BUILDING_TITLE,
        language: str = "zh-TW",
        request_id: Optional[str] = None,
        config: Optional[ProcessingConfig] = None
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
            if filename.lower().endswith('.pdf'):
                processed_images = await self._process_pdf(content, config)
            else:
                processed_images = await self._process_image(content, config)
            
            # Step 2: Text detection and recognition
            text_results = []
            for img_idx, image in enumerate(processed_images):
                text_blocks = await self.text_detector.detect(image)
                recognized_text = await self.text_recognizer.recognize(
                    image, text_blocks, language
                )
                text_results.append({
                    'page': img_idx + 1,
                    'text_blocks': recognized_text
                })
            
            # Step 3: Layout analysis
            layout_analysis = await self.layout_analyzer.analyze(processed_images[0])
            
            # Step 4: Table detection (if enabled)
            tables = []
            if config.enable_table_detection:
                tables = await self.table_detector.detect_tables(processed_images)
            
            # Step 5: VLM-based content understanding
            vlm_result = await self.vlm_engine.process(
                images=processed_images,
                text_results=text_results,
                layout_analysis=layout_analysis,
                document_type=document_type,
                language=language
            )
            
            # Step 6: Compile final result
            final_result = self._compile_result(
                vlm_result=vlm_result,
                text_results=text_results,
                layout_analysis=layout_analysis,
                tables=tables,
                document_type=document_type,
                config=config
            )
            
            logger.info(f"Document processing completed for {request_id}")
            return final_result
            
        except Exception as e:
            logger.error(f"Error processing document {request_id}: {e}")
            raise
    
    async def _process_pdf(self, content: bytes, config: ProcessingConfig) -> List:
        """Process PDF document"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_file.flush()
            
            # Extract and preprocess PDF pages
            pages = await self.pdf_preprocessor.extract_pages(
                tmp_file.name, 
                dpi=config.pdf_dpi,
                max_pages=config.max_pages
            )
            
            # Preprocess each page
            processed_pages = []
            for page in pages:
                processed = await self.preprocessor.preprocess(
                    page, 
                    enhance_quality=config.enhance_quality,
                    remove_noise=config.remove_noise
                )
                processed_pages.append(processed)
            
            return processed_pages
    
    async def _process_image(self, content: bytes, config: ProcessingConfig) -> List:
        """Process single image"""
        processed_image = await self.preprocessor.preprocess(
            content,
            enhance_quality=config.enhance_quality,
            remove_noise=config.remove_noise,
            resize_to=config.target_size
        )
        return [processed_image]
    
    def _compile_result(
        self,
        vlm_result: Dict[str, Any],
        text_results: List[Dict],
        layout_analysis: Dict,
        tables: List[Dict],
        document_type: DocumentType,
        config: ProcessingConfig
    ) -> Dict[str, Any]:
        """Compile final processing result"""
        return {
            'document_type': document_type.value,
            'vlm_analysis': vlm_result,
            'raw_text': text_results,
            'layout_analysis': layout_analysis,
            'tables': tables,
            'processing_config': config.dict(),
            'confidence_score': self._calculate_confidence(vlm_result, text_results),
            'timestamp': datetime.now().isoformat()
        }
    
    def _calculate_confidence(self, vlm_result: Dict, text_results: List[Dict]) -> float:
        """Calculate overall confidence score"""
        # Simple confidence calculation based on text extraction quality
        total_blocks = sum(len(page['text_blocks']) for page in text_results)
        if total_blocks == 0:
            return 0.0
        
        # Higher confidence if VLM result contains structured data
        vlm_confidence = 0.7 if vlm_result and any(vlm_result.values()) else 0.3
        
        return min(0.95, vlm_confidence + 0.1)  # Cap at 0.95
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all components"""
        checks = {
            'preprocessor': await self.preprocessor.health_check(),
            'text_detector': await self.text_detector.health_check(),
            'text_recognizer': await self.text_recognizer.health_check(),
            'vlm_engine': await self.vlm_engine.health_check()
        }
        
        all_healthy = all(check['status'] == 'healthy' for check in checks.values())
        
        return {
            'status': 'healthy' if all_healthy else 'degraded',
            'components': checks
        }
    
    async def check_vlm_services(self) -> Dict[str, Any]:
        """Check status of VLM services"""
        return await self.vlm_engine.check_services()
    
    async def is_ready(self) -> bool:
        """Check if processor is ready for requests"""
        try:
            health = await self.health_check()
            return health['status'] == 'healthy'
        except Exception:
            return False