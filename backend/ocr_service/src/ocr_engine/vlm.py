import os
import base64
import json
from pathlib import Path
from typing import Dict, Any, Optional
import asyncio

from loguru import logger
try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None
try:
    from anthropic import AsyncAnthropic
except ImportError:
    AsyncAnthropic = None
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from .base import OCREngine

SYSTEM_PROMPT = """
# 角色指令
你是一位專業的地政士（土地登記專業代理人），專門解析「建物登記第二類謄本」（建物標示及所有權部）。你的任務是從用戶提供的PDF謄本文字內容中，精準提取結構化資訊，並輸出標準化JSON格式。

# 核心要求
1. **只處理文字內容**：僅使用用戶提供的文字內容，不臆測、不添加未出現的資訊
2. **資料準確性**：
   - 原樣複製文字內容，除非明顯錯字（如「粼」→「鄰」）可註明修正
   - 數字、日期、地址保持原文格式
   - 遇不一致處（如多個執照號碼）全部保留並註記
3. **完整涵蓋**：確保提取謄本中所有欄位資訊，不遺漏任何段落

# 輸出格式規範
輸出 **必須且只能** 為以下JSON結構，包含所有6個主要部分：

```json
{
  "document_info": {
    "document_type": "string (謄本類型)",
    "print_time": "string (列印時間)",
    "document_id_checking_number": "string (謄本檢查號)",
    "verification_url": "string (查驗網址)",
    "issuing_office": "string (核發單位)",
    "issuing_officer": "string (主任姓名)",
    "certificate_number": "string (電謄字第號)"
  },
  "building_basic_info": {
    "district": "string (行政區)",
    "section": "string (地段/小段)",
    "building_number": "string (建號)",
    "address": "string (門牌地址)",
    "land_lot_number": "string (坐落地號)"
  },
  "building_characteristics": {
    "building_registration_date": "string (建物標示部登記日期)",
    "building_sitting_on_land_lot_number": "string (建物座落地號)",
    "building_address": "string (建物門牌)",
    "main_use": "string (主要用途)",
    "main_structure": "string (主要建材)",
    "total_floors": "string (層數)",
    "located_floor": "string (層次)",
    "construction_completion_date": "string (建築完成日期)",
    "accessory_structures": ["string (附屬建物用途清單)"],
    "use_permit_number": ["string (使用執照字號清單)"]
  },
  "shared_areas": {
    "shared_building_number": "string (共有部分建號)",
    "shared_area_sqm": "number (共有部分面積，轉換為數字)"
  },
  "ownership_info": {
    "registration_order": "string (登記次序)",
    "registration_date": "string (登記日期)",
    "cause_date": "string (原因發生日期)",
    "owner": "string (所有權人姓名)",
    "owner_address": "string (所有權人住址)",
    "ownership_share": "string (權利範圍)",
    "ownership_certificate_number": "string (權狀字號)"
  },
  "notes": [
    "string (重要備註事項清單)"
  ]
}
```

# 輸出範例 (Few-shot Example)
以下為一個標準的輸出範例，請嚴格參考此格式：

```json
{
  "document_info": {
    "document_type": "建物登記第二類謄本（建物標示及所有權部）",
    "print_time": "民國102年07月05日10時46分",
    "document_number": "102AF007104REG03135F0D8C4F040059A60088EE802831",
    "verification_url": "http://ttt.land.net.tw",
    "issuing_office": "大安地政事務所",
    "issuing_officer": "主任 高麗香",
    "certificate_number": "大安電腾字第007104號"
  },
  "building_basic_info": {
    "district": "大安區",
    "section": "大安段一小段",
    "building_number": "02069-000建號",
    "address": "敦化南路586號十三樓之1",
    "land_lot_number": "大安段一小段 0020-0000"
  },
  "building_characteristics": {
    "main_use": "住家用",
    "main_structure": "鋼筋混凝土造",
    "total_floors": "018層",
    "located_floor": "十三層",
    "construction_completion_date": "民國076年07月11日",
    "accessory_structures": ["陽台", "花台"],
    "use_permit_number": ["76年使字509號", "76年使509號"]
  },
  "shared_areas": {
    "shared_building_number": "大安段一小段02089-000建號",
    "shared_area_sqm": 2029.25
  },
  "ownership_info": {
    "registration_order": "0001",
    "registration_date": "民國076年09月08日",
    "cause_date": "民國076年07月11日",
    "owner": "詹琬",
    "owner_address": "台北市松山區五全里7粼永吉路316號11楼",
    "ownership_share": "全部 1分之1",
    "ownership_certificate_number": "076北建字第024560號"
  },
  "notes": [
    "本謄本係建物標示及所有權部簡本，详细權利狀態請参閣全部本",
    "本電子謄本查驗期限為三個月"
  ]
}
```
"""

class VLMEngine(OCREngine):
    def __init__(self, provider: str, model: str, api_key: Optional[str] = None):
        self.provider = provider
        self.model = model
        self.api_key = api_key or self._get_api_key(provider)
        
    def _get_api_key(self, provider: str) -> Optional[str]:
        key_map = {
            "openai": "OPENAI_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "grok": "XAI_API_KEY",
            "dashscope": "DASHSCOPE_API_KEY",
        }
        env_var = key_map.get(provider)
        return os.getenv(env_var) if env_var else None

    @property
    def name(self) -> str:
        return f"{self.provider}-{self.model}"

    def _encode_image(self, image_path: Path) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    async def process(self, image_path: Path) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError(f"API key not found for {self.provider}")

        logger.info(f"Processing {image_path} with {self.name}")
        
        try:
            if self.provider == "openai":
                return await self._process_openai_compatible(image_path, base_url=None)
            elif self.provider == "anthropic":
                return await self._process_anthropic(image_path)
            elif self.provider == "google":
                return await self._process_google(image_path)
            elif self.provider == "deepseek":
                return await self._process_openai_compatible(image_path, base_url="https://api.deepseek.com")
            elif self.provider == "grok":
                return await self._process_openai_compatible(image_path, base_url="https://api.x.ai/v1")
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
        except Exception as e:
            logger.error(f"Error processing with {self.name}: {e}")
            raise

    async def _process_openai_compatible(self, image_path: Path, base_url: Optional[str]) -> Dict[str, Any]:
        if not AsyncOpenAI:
            raise ImportError("openai package is not installed")
            
        client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        base64_image = self._encode_image(image_path)
        
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system", 
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "請解析這份建物謄本圖片。"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)

    async def _process_anthropic(self, image_path: Path) -> Dict[str, Any]:
        if not AsyncAnthropic:
            raise ImportError("anthropic package is not installed")

        client = AsyncAnthropic(api_key=self.api_key)
        base64_image = self._encode_image(image_path)
        media_type = "image/jpeg" # Assuming jpeg, should detect
        if image_path.suffix.lower() == '.png':
            media_type = "image/png"

        response = await client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": "請解析這份建物謄本圖片並輸出 JSON。"
                        }
                    ]
                }
            ]
        )
        
        # Anthropic might wrap JSON in text, but usually with prompt it's clean.
        content = response.content[0].text
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = content[start:end]
            return json.loads(json_str)
        return json.loads(content)

    async def _process_google(self, image_path: Path) -> Dict[str, Any]:
        if not genai:
            raise ImportError("google-generativeai package is not installed")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.model)
        
        import PIL.Image
        img = PIL.Image.open(image_path)
        
        response = await model.generate_content_async(
            [SYSTEM_PROMPT, img],
            generation_config={"response_mime_type": "application/json"}
        )
        
        return json.loads(response.text)
