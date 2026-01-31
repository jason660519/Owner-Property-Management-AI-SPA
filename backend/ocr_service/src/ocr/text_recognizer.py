"""
Text recognition module using Tesseract OCR
"""
import pytesseract
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import asyncio
from loguru import logger

class TextRecognizer:
    def __init__(self):
        self.is_initialized = False
        self.supported_languages = {
            'zh-TW': 'chi_tra+eng',    # Traditional Chinese + English
            'zh-CN': 'chi_sim+eng',     # Simplified Chinese + English
            'en': 'eng',                # English
            'ja': 'jpn+eng',            # Japanese + English
            'ko': 'kor+eng',            # Korean + English
            'default': 'eng'
        }
    
    async def initialize(self):
        """Initialize text recognizer"""
        if self.is_initialized:
            return
        
        try:
            # Check Tesseract availability
            pytesseract.get_tesseract_version()
            self.is_initialized = True
            logger.info("Text recognizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize text recognizer: {e}")
            raise
    
    async def recognize(
        self, 
        image_data: bytes, 
        text_regions: List[Dict[str, Any]],
        language: str = 'zh-TW',
        config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Recognize text in detected regions
        
        Args:
            image_data: Preprocessed image bytes
            text_regions: Detected text regions from TextDetector
            language: Language code for OCR
            config: Additional Tesseract configuration
            
        Returns:
            List of recognized text with confidence and position
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            
            if image is None:
                raise ValueError("Failed to decode image for text recognition")
            
            # Get language configuration
            lang = self.supported_languages.get(language, self.supported_languages['default'])
            
            # Default Tesseract configuration
            tesseract_config = config or {
                '--psm': '6',      # Assume uniform block of text
                '--oem': '3',      # Default OCR engine
                '-c': 'preserve_interword_spaces=1'
            }
            
            recognized_text = []
            
            for region in text_regions:
                x, y, w, h = region['bbox']
                
                # Extract region from image
                roi = image[y:y+h, x:x+w]
                
                if roi.size == 0:
                    continue
                
                # Apply OCR
                ocr_result = pytesseract.image_to_data(
                    roi, 
                    lang=lang,
                    output_type=pytesseract.Output.DICT,
                    config=self._build_config_string(tesseract_config)
                )
                
                # Process OCR results
                region_text = self._process_ocr_results(ocr_result, x, y)
                
                if region_text:
                    recognized_text.extend(region_text)
            
            logger.info(f"Recognized {len(recognized_text)} text elements")
            return recognized_text
            
        except Exception as e:
            logger.error(f"Text recognition failed: {e}")
            raise
    
    def _build_config_string(self, config: Dict[str, Any]) -> str:
        """Build Tesseract configuration string"""
        return ' '.join([f'{k}={v}' if k.startswith('-c') else f'{k} {v}' 
                        for k, v in config.items()])
    
    def _process_ocr_results(
        self, 
        ocr_result: Dict[str, Any], 
        offset_x: int, 
        offset_y: int
    ) -> List[Dict[str, Any]]:
        """Process Tesseract OCR results"""
        recognized_text = []
        
        n_boxes = len(ocr_result['text'])
        
        for i in range(n_boxes):
            text = ocr_result['text'][i].strip()
            confidence = float(ocr_result['conf'][i])
            
            # Skip empty text and low confidence results
            if not text or confidence < 10:
                continue
            
            # Get bounding box coordinates
            x = ocr_result['left'][i] + offset_x
            y = ocr_result['top'][i] + offset_y
            w = ocr_result['width'][i]
            h = ocr_result['height'][i]
            
            recognized_text.append({
                'text': text,
                'confidence': confidence / 100.0,  # Convert to 0-1 scale
                'bbox': [x, y, w, h],
                'page_num': ocr_result.get('page_num', [1])[i],
                'block_num': ocr_result.get('block_num', [0])[i],
                'line_num': ocr_result.get('line_num', [0])[i],
                'word_num': ocr_result.get('word_num', [0])[i]
            })
        
        return recognized_text
    
    async def recognize_whole_image(
        self, 
        image_data: bytes, 
        language: str = 'zh-TW',
        config: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Recognize text from whole image (without region detection)
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            lang = self.supported_languages.get(language, self.supported_languages['default'])
            
            tesseract_config = config or {
                '--psm': '6',
                '--oem': '3'
            }
            
            text = pytesseract.image_to_string(
                image, 
                lang=lang,
                config=self._build_config_string(tesseract_config)
            )
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Whole image recognition failed: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Test with sample image
            test_image = np.zeros((100, 300), dtype=np.uint8)
            cv2.putText(test_image, "OCR Test 測試", (10, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, 255, 2)
            
            success, encoded = cv2.imencode('.png', test_image)
            if success:
                text = await self.recognize_whole_image(encoded.tobytes(), 'zh-TW')
                
                return {
                    'status': 'healthy',
                    'message': f'Text recognizer functioning normally, recognized: {text}',
                    'recognized_text': text
                }
            
            return {
                'status': 'healthy',
                'message': 'Text recognizer basic functionality verified'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Text recognizer error: {e}'
            }