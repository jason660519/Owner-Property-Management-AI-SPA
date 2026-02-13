import os
from typing import Any, Dict, Optional

from elasticsearch import AsyncElasticsearch
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential


class SearchClient:
    def __init__(self):
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        self.client = AsyncElasticsearch(self.es_url)
        self.index_name = "property_documents"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def initialize(self):
        """Initialize the index with IK analyzer mapping"""
        if not await self.client.indices.exists(index=self.index_name):
            mapping = {
                "settings": {
                    "analysis": {
                        "analyzer": {
                            "ik_smart_analyzer": {
                                "type": "custom",
                                "tokenizer": "ik_smart",
                                "filter": ["stconvert_filter", "lowercase"]
                            },
                            "ik_max_word_analyzer": {
                                "type": "custom",
                                "tokenizer": "ik_max_word",
                                "filter": ["stconvert_filter", "lowercase"]
                            }
                        },
                        "filter": {
                            "stconvert_filter": {
                                "type": "stconvert",
                                "convert_type": "t2s",
                                "keep_both": False
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "document_id": {"type": "keyword"},
                        "owner_name": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer",
                            "fields": {
                                "keyword": {"type": "keyword"}
                            }
                        },
                        "property_address": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer"
                        },
                        "building_number": {"type": "keyword"},
                        "land_lot_number": {"type": "keyword"},
                        "extracted_data": {
                            "type": "object",
                            "enabled": False  # Store but don't index full object structure unless specified
                        },
                        "ocr_text": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer"
                        },
                        "created_at": {"type": "date"},
                        "parsing_duration_ms": {"type": "integer"},
                        "confidence_score": {"type": "float"}
                    }
                }
            }
            await self.client.indices.create(index=self.index_name, body=mapping)
            logger.info(f"Created Elasticsearch index: {self.index_name}")
        else:
            logger.info(f"Elasticsearch index {self.index_name} already exists")

    async def index_document(self, doc_id: str, data: Dict[str, Any]):
        """Index a document"""
        try:
            # Ensure we are not sending None for text fields if possible, or handle them
            # Construct the document body for ES
            body = {
                "document_id": doc_id,
                "owner_name": data.get("owner_name"),
                "property_address": data.get("property_address"),
                "building_number": data.get("building_number"),
                "land_lot_number": data.get("land_lot_number"),
                "extracted_data": data.get("extracted_data"),
                "ocr_text": data.get("ocr_text", ""), # Assuming we might want to index full text if available
                "created_at": data.get("created_at"),
                "parsing_duration_ms": data.get("parsing_duration_ms"),
                "confidence_score": data.get("confidence_score")
            }

            await self.client.index(index=self.index_name, id=doc_id, document=body)
            logger.info(f"Indexed document {doc_id} to Elasticsearch")
        except Exception as e:
            logger.error(f"Failed to index document {doc_id}: {e}")
            raise

    async def search_documents(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search documents with fuzzy matching and compound queries.
        """
        must_clauses = []

        if query_text:
            must_clauses.append({
                "multi_match": {
                    "query": query_text,
                    "fields": ["owner_name^3", "property_address^2", "ocr_text"],
                    "fuzziness": "AUTO",
                    "analyzer": "ik_smart_analyzer"
                }
            })

        if filters:
            for key, value in filters.items():
                if value is not None:
                    if key == "owner_name":
                         must_clauses.append({"match": {"owner_name": {"query": value, "analyzer": "ik_smart_analyzer"}}})
                    else:
                        must_clauses.append({"term": {key: value}})

        body = {
            "query": {
                "bool": {
                    "must": must_clauses
                }
            },
            "from": offset,
            "size": limit,
            "highlight": {
                "fields": {
                    "owner_name": {},
                    "property_address": {},
                    "ocr_text": {}
                }
            }
        }

        response = await self.client.search(index=self.index_name, body=body)
        return response.body

    async def count_properties_by_owner(self, owner_name: str) -> int:
        """Count properties for a specific owner"""
        body = {
            "query": {
                "match": {
                    "owner_name": {
                        "query": owner_name,
                        "analyzer": "ik_smart_analyzer"
                    }
                }
            }
        }
        response = await self.client.count(index=self.index_name, body=body)
        return response['count']

    async def get_cluster_health(self) -> Dict[str, Any]:
        """Get Elasticsearch cluster health"""
        return await self.client.cluster.health()

    async def get_index_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return await self.client.indices.stats(index=self.index_name)

    async def close(self):
        await self.client.close()

# Singleton instance
_search_client: Optional[SearchClient] = None

def get_search_client() -> SearchClient:
    global _search_client
    if _search_client is None:
        _search_client = SearchClient()
    return _search_client
