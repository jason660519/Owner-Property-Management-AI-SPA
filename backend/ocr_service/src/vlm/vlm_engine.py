"""
Vision Language Model engine for intelligent content understanding
"""
import base64
import json
from typing import Dict, Any, List, Optional
import asyncio
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from ...ocr_engine.vlm import VLMEngine as BaseVLMEngine

class VLMEngine(BaseVLMEngine):
    def __init__(self):
        super().__init__()
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize VLM engine with multiple providers"""
        if self.is_initialized:
            return
        
        try:
            # Initialize base VLM engine
            await super().initialize()
            self.is_initialized = True
            logger.info("VLM engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize VLM engine: {e}")
            raise
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    async def process(
        self,
        images: List[bytes],
        text_results: List[Dict[str, Any]],
        layout_analysis: Dict[str, Any],
        document_type: str = "building_title",
        language: str = "zh-TW",
        provider_priority: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Process document with VLM for intelligent understanding
        
        Args:
            images: List of preprocessed image bytes
            text_results: OCR text recognition results
            layout_analysis: Document layout analysis
            document_type: Type of document being processed
            language: Document language
            provider_priority: Preferred VLM providers in order
            
        Returns:
            Structured understanding of document content
        """
        try:
            # Prepare context for VLM
            context = self._prepare_context(
                text_results, layout_analysis, document_type, language
            )
            
            # Process each image with VLM
            vlm_results = []
            for i, image_data in enumerate(images):
                result = await self._process_image_with_vlm(
                    image_data, context, document_type, language, provider_priority
                )
                vlm_results.append({
                    'page': i + 1,
                    'result': result
                })
            
            # Merge results from all pages
            final_result = self._merge_results(vlm_results, document_type)
            
            logger.info(f"VLM processing completed for {len(images)} pages")
            return final_result
            
        except Exception as e:
            logger.error(f"VLM processing failed: {e}")
            raise
    
    def _prepare_context(
        self,
        text_results: List[Dict[str, Any]],
        layout_analysis: Dict[str, Any],
        document_type: str,
        language: str
    ) -> str:
        """Prepare context information for VLM"""
        # Extract key text content
        all_text = []
        for page_result in text_results:
            for text_item in page_result.get('text_blocks', []):
                if text_item.get('text'):
                    all_text.append(text_item['text'])
        
        context = f"""
Document Type: {document_type}
Language: {language}
Layout Analysis: {json.dumps(layout_analysis, ensure_ascii=False, indent=2)}

Extracted Text Content:
{"\n".join(all_text)}
"""
        
        return context.strip()
    
    async def _process_image_with_vlm(
        self,
        image_data: bytes,
        context: str,
        document_type: str,
        language: str,
        provider_priority: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Process single image with VLM"""
        # Convert image to base64 for VLM API
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Prepare messages for VLM
        messages = [
            {
                "role": "system",
                "content": self.SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Context: {context}\n\nPlease analyze this document image and extract structured information."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
        
        # Try providers in priority order
        providers = provider_priority or ["deepseek", "grok", "openai", "anthropic", "google"]
        
        for provider in providers:
            try:
                result = await self._call_vlm_provider(provider, messages, document_type)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"VLM provider {provider} failed: {e}")
                continue
        
        raise Exception("All VLM providers failed")
    
    async def _call_vlm_provider(
        self,
        provider: str,
        messages: List[Dict[str, Any]],
        document_type: str
    ) -> Dict[str, Any]:
        """Call specific VLM provider"""
        try:
            # Create provider-specific engine
            engine = self._create_engine(provider, "auto")
            
            # Call VLM API
            response = await engine.process(messages)
            
            # Parse response
            if isinstance(response, str):
                # Try to parse JSON response
                try:
                    return json.loads(response)
                except json.JSONDecodeError:
                    # Extract JSON from text response
                    return self._extract_json_from_text(response)
            elif isinstance(response, dict):
                return response
            else:
                raise ValueError(f"Unexpected response type: {type(response)}")
                
        except Exception as e:
            logger.error(f"VLM provider {provider} call failed: {e}")
            raise
    
    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text response"""
        try:
            # Look for JSON code blocks
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            
            # Look for plain JSON
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
                
            raise ValueError("No JSON found in response")
        except Exception as e:
            logger.warning(f"Failed to extract JSON from text: {e}")
            raise
    
    def _merge_results(self, vlm_results: List[Dict[str, Any]], document_type: str) -> Dict[str, Any]:
        """Merge results from multiple pages"""
        if not vlm_results:
            return {}
        
        if len(vlm_results) == 1:
            return vlm_results[0]['result']
        
        # For multi-page documents, merge intelligently
        merged_result = {}
        
        for page_result in vlm_results:
            result = page_result['result']
            if not result:
                continue
            
            # Merge based on document type
            if document_type == "building_title":
                merged_result = self._merge_building_title_results(merged_result, result)
            else:
                # Default merge strategy
                for key, value in result.items():
                    if key not in merged_result:
                        merged_result[key] = value
                    elif isinstance(value, list) and isinstance(merged_result[key], list):
                        merged_result[key].extend(value)
        
        return merged_result
    
    def _merge_building_title_results(
        self,
        current: Dict[str, Any],
        new: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge building title document results"""
        if not current:
            return new
        
        merged = current.copy()
        
        # Merge specific building title fields
        for key in ['document_info', 'building_basic_info', 'building_characteristics']:
            if key in new and new[key]:
                if key not in merged or not merged[key]:
                    merged[key] = new[key]
                else:
                    # Prefer non-empty values
                    for sub_key, sub_value in new[key].items():
                        if sub_value and (not merged[key].get(sub_key) or merged[key][sub_key] == ""):
                            merged[key][sub_key] = sub_value
        
        # Merge lists
        for key in ['accessory_structures', 'use_permit_number', 'notes']:
            if key in new and new[key]:
                if key not in merged:
                    merged[key] = new[key]
                else:
                    # Add unique items
                    for item in new[key]:
                        if item not in merged[key]:
                            merged[key].append(item)
        
        return merged
    
    async def check_services(self) -> Dict[str, Any]:
        """Check status of all VLM services"""
        service_status = {}
        providers = ["deepseek", "grok", "openai", "anthropic", "google"]
        
        for provider in providers:
            try:
                # Simple test to check API connectivity
                test_messages = [{"role": "user", "content": "Hello"}]
                engine = self._create_engine(provider, "auto")
                
                # Check if API key is available
                if not engine.api_key:
                    service_status[provider] = {"status": "unavailable", "message": "API key not configured"}
                    continue
                
                # Try a simple call
                await engine.process(test_messages, timeout=5.0)
                service_status[provider] = {"status": "healthy", "message": "Service responding"}
                
            except Exception as e:
                service_status[provider] = {"status": "unhealthy", "message": str(e)}
        
        # Calculate overall status
        healthy_count = sum(1 for status in service_status.values() 
                          if status["status"] == "healthy")
        
        overall_status = "healthy" if healthy_count >= 2 else "degraded"
        if healthy_count == 0:
            overall_status = "unavailable"
        
        return {
            "overall": overall_status,
            "services": service_status,
            "healthy_count": healthy_count,
            "total_services": len(providers)
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            services_status = await self.check_services()
            
            return {
                'status': services_status['overall'],
                'message': f'VLM engine status: {services_status["overall"]}',
                'details': services_status
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'VLM engine health check failed: {e}'
            }