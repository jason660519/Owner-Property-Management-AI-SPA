"""
People Database IndexClient - Initialize and manage people_database Elasticsearch index
"""
import os
import re
from typing import Any, Dict, Optional

from elasticsearch import AsyncElasticsearch
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential


TW_ID_PATTERN = re.compile(r"^[a-zA-Z][12]\d{8}$")


def normalize_phone_query(text: str) -> str:
    """Normalize phone-like query by removing all non-digits."""
    return re.sub(r"\D", "", text)


def classify_people_search_query(query_text: str) -> Dict[str, str]:
    """
    Classify people search intent.

    Returns:
        {"intent": "id_number" | "phone" | "full_text", "normalized": str}
    """
    normalized_text = query_text.strip()
    compact = normalized_text.replace(" ", "").upper()
    phone_digits = normalize_phone_query(normalized_text)

    if TW_ID_PATTERN.fullmatch(compact):
        return {"intent": "id_number", "normalized": compact}

    # Taiwan phone-like patterns: local area code/mobile/legacy datasets with 8+ digits.
    if len(phone_digits) >= 8 and phone_digits.isdigit():
        return {"intent": "phone", "normalized": phone_digits}

    return {"intent": "full_text", "normalized": normalized_text}


def resolve_quality_thresholds(quality_band: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """Resolve named quality band to min/max threshold tuple."""
    if not quality_band:
        return (None, None)

    band = quality_band.strip().lower()
    if band == "high":
        return (0.8, None)
    if band == "medium":
        return (0.5, 0.8)
    if band == "low":
        return (None, 0.5)
    return (None, None)


class PeopleDatabaseIndexClient:
    """Client for managing People Database Elasticsearch index"""
    
    def __init__(self):
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        self.client = AsyncElasticsearch(self.es_url)
        self.index_name = "people_database"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def initialize(self):
        """Initialize the people_database index with IK analyzer mapping"""
        if not await self.client.indices.exists(index=self.index_name):
            mapping = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
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
                        # ID fields
                        "record_id": {
                            "type": "keyword"
                        },
                        "import_batch_id": {
                            "type": "keyword"
                        },
                        
                        # Core fields (searchable)
                        "name": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer",
                            "fields": {
                                "keyword": {"type": "keyword"}
                            }
                        },
                        "id_number": {
                            "type": "keyword"
                        },
                        "phone": {
                            "type": "keyword"
                        },
                        "mobile": {
                            "type": "keyword"
                        },
                        "email": {
                            "type": "keyword"
                        },
                        "address": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer"
                        },
                        "company": {
                            "type": "keyword"
                        },
                        "organization": {
                            "type": "keyword"
                        },
                        "title_position": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer"
                        },
                        
                        # Data source
                        "data_source": {
                            "type": "keyword"
                        },
                        "source_file_path": {
                            "type": "keyword",
                            "index": False
                        },
                        "source_document_id": {
                            "type": "keyword"
                        },
                        
                        # Quality metrics
                        "ocr_confidence": {
                            "type": "float"
                        },
                        "quality_score": {
                            "type": "float"
                        },
                        "duplicate_flag": {
                            "type": "keyword"
                        },
                        
                        # Audit fields
                        "created_at": {
                            "type": "date"
                        },
                        "updated_at": {
                            "type": "date"
                        },
                        
                        # Full text (for OCR fallback)
                        "original_text": {
                            "type": "text",
                            "analyzer": "ik_max_word_analyzer",
                            "search_analyzer": "ik_smart_analyzer",
                            "index": False  # Store but don't index to save space
                        }
                    }
                }
            }
            
            try:
                await self.client.indices.create(index=self.index_name, body=mapping)
                logger.info(f"Created Elasticsearch index: {self.index_name}")
            except Exception as e:
                logger.error(f"Failed to create index {self.index_name}: {e}")
                raise
        else:
            logger.info(f"Elasticsearch index {self.index_name} already exists")

    async def index_document(self, document: Dict[str, Any], doc_id: Optional[str] = None) -> Dict[str, Any]:
        """Index a single document"""
        try:
            result = await self.client.index(
                index=self.index_name,
                id=doc_id or document.get('record_id'),
                document=document
            )
            return result
        except Exception as e:
            logger.error(f"Failed to index document: {e}")
            raise

    async def bulk_index_documents(self, documents: list, batch_size: int = 1000) -> Dict[str, Any]:
        """Bulk index documents"""
        from elasticsearch.helpers import async_bulk
        
        actions = []
        for doc in documents:
            actions.append({
                "_index": self.index_name,
                "_id": doc.get('record_id'),
                "_source": doc
            })
        
        try:
            success, failed = await async_bulk(
                self.client,
                actions,
                chunk_size=batch_size,
                raise_on_error=False
            )
            logger.info(f"Bulk indexed {success} documents, {failed} failed")
            return {"success": success, "failed": failed}
        except Exception as e:
            logger.error(f"Bulk indexing failed: {e}")
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
        
        Args:
            query_text: Search text for fuzzy matching
            filters: Optional filters like data_source, quality_score, ocr_confidence
            limit: Number of results
            offset: Pagination offset
        """
        should_clauses = []
        filter_clauses = []
        must_not_clauses = []

        # Query intent aware search:
        # - phone / id_number: exact-first boosting to avoid fuzzy false positives.
        # - full_text: multi-field fuzzy search.
        if query_text:
            profile = classify_people_search_query(query_text)
            intent = profile["intent"]
            normalized = profile["normalized"]

            if intent == "id_number":
                should_clauses.append({
                    "term": {
                        "id_number": {
                            "value": normalized,
                            "boost": 25.0
                        }
                    }
                })
                should_clauses.append({
                    "multi_match": {
                        "query": query_text,
                        "fields": ["name^1.5", "address", "organization", "company"],
                        "fuzziness": "AUTO",
                    }
                })
            elif intent == "phone":
                should_clauses.append({
                    "term": {
                        "phone": {
                            "value": normalized,
                            "boost": 30.0
                        }
                    }
                })
                # Keep compatibility with historical raw formatting.
                should_clauses.append({
                    "term": {
                        "phone": {
                            "value": query_text.strip(),
                            "boost": 20.0
                        }
                    }
                })
                should_clauses.append({
                    "term": {
                        "mobile": {
                            "value": normalized,
                            "boost": 25.0
                        }
                    }
                })
                should_clauses.append({
                    "multi_match": {
                        "query": query_text,
                        "fields": ["name", "address", "organization", "company"],
                    }
                })
            else:
                should_clauses.append({
                    "multi_match": {
                        "query": query_text,
                        "fields": ["name^2", "id_number", "phone", "mobile", "email", "address", "organization", "company"],
                        "fuzziness": "AUTO",
                        "prefix_length": 0
                    }
                })
                should_clauses.append({
                    "match_phrase": {
                        "name": {
                            "query": query_text,
                            "boost": 4.0
                        }
                    }
                })
                should_clauses.append({
                    "match_phrase": {
                        "address": {
                            "query": query_text,
                            "boost": 2.5
                        }
                    }
                })
        
        # Apply filters
        if filters:
            if filters.get('data_sources'):
                filter_clauses.append({
                    "terms": {"data_source": filters['data_sources']}
                })
            
            if filters.get('import_batch_id'):
                filter_clauses.append({
                    "term": {"import_batch_id": filters['import_batch_id']}
                })
            
            if filters.get('imported_from_date'):
                filter_clauses.append({
                    "range": {"created_at": {"gte": filters['imported_from_date']}}
                })
            
            if filters.get('imported_to_date'):
                filter_clauses.append({
                    "range": {"created_at": {"lte": filters['imported_to_date']}}
                })
            
            if filters.get('min_quality_score') is not None:
                filter_clauses.append({
                    "range": {"quality_score": {"gte": filters['min_quality_score']}}
                })

            if filters.get('max_quality_score') is not None:
                filter_clauses.append({
                    "range": {"quality_score": {"lt": filters['max_quality_score']}}
                })
            
            if filters.get('min_ocr_confidence') is not None:
                filter_clauses.append({
                    "range": {"ocr_confidence": {"gte": filters['min_ocr_confidence']}}
                })
            
            if filters.get('exclude_duplicates'):
                must_not_clauses.append({
                    "term": {"duplicate_flag": "confirmed_duplicate"}
                })
        
        # Build query
        bool_query: Dict[str, Any] = {
            "bool": {
                "filter": filter_clauses,
                "must_not": must_not_clauses
            }
        }

        if should_clauses:
            bool_query["bool"]["should"] = should_clauses
            bool_query["bool"]["minimum_should_match"] = 1
        else:
            bool_query["bool"]["must"] = [{"match_all": {}}]
        
        # Build body
        body = {
            "query": bool_query,
            "from": offset,
            "size": limit,
            "sort": [
                {"_score": "desc"},
                {"created_at": {"order": "desc", "unmapped_type": "date"}}
            ],
            "highlight": {
                "fields": {
                    "name": {},
                    "id_number": {},
                    "phone": {},
                    "address": {},
                    "organization": {},
                    "company": {}
                }
            },
            "track_total_hits": True
        }
        
        try:
            response = await self.client.search(index=self.index_name, body=body)
            return response.body
        except Exception as e:
            logger.error(f"Search failed: {e}")
            raise

    async def update_document(self, doc_id: str, updates: Dict[str, Any]):
        """Update a document"""
        try:
            result = await self.client.update(
                index=self.index_name,
                id=doc_id,
                doc=updates
            )
            return result
        except Exception as e:
            logger.error(f"Failed to update document {doc_id}: {e}")
            raise

    async def delete_document(self, doc_id: str):
        """Delete a document"""
        try:
            result = await self.client.delete(index=self.index_name, id=doc_id)
            return result
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            raise

    async def reindex(self) -> Dict[str, Any]:
        """Reindex all documents (non-destructive)"""
        try:
            result = await self.client.indices.forcemerge(index=self.index_name)
            logger.info(f"Reindexed {self.index_name}")
            return result
        except Exception as e:
            logger.error(f"Reindex failed: {e}")
            raise

    async def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        try:
            response = await self.client.search(
                index=self.index_name,
                body={
                    "size": 0,
                    "track_total_hits": True,
                    "aggs": {
                        "total_sources": {"cardinality": {"field": "data_source"}},
                        "avg_quality_score": {"avg": {"field": "quality_score"}},
                    },
                },
            )
            body = response.body
            total_records = body.get("hits", {}).get("total", {}).get("value", 0)
            total_sources = body.get("aggregations", {}).get("total_sources", {}).get("value", 0)
            avg_quality_score = body.get("aggregations", {}).get("avg_quality_score", {}).get("value")
            return {
                "total_records": total_records,
                "indexed_records": total_records,
                "total_sources": total_sources,
                "avg_quality_score": avg_quality_score,
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            raise

    async def get_data_source_facets(self, size: int = 100) -> list[dict[str, Any]]:
        """Get indexed data source facets with document count."""
        try:
            response = await self.client.search(
                index=self.index_name,
                body={
                    "size": 0,
                    "aggs": {
                        "data_sources": {
                            "terms": {
                                "field": "data_source",
                                "size": size,
                                "order": {"_count": "desc"},
                            }
                        }
                    },
                },
            )
            buckets = response.body.get("aggregations", {}).get("data_sources", {}).get("buckets", [])
            return [
                {"key": bucket.get("key"), "count": bucket.get("doc_count", 0)}
                for bucket in buckets
                if bucket.get("key")
            ]
        except Exception as e:
            logger.error(f"Failed to get data source facets: {e}")
            raise

    async def close(self):
        """Close the client"""
        await self.client.close()


# Singleton instance
_people_db_client: Optional[PeopleDatabaseIndexClient] = None


async def get_people_db_client() -> PeopleDatabaseIndexClient:
    """Get or initialize the client"""
    global _people_db_client
    if _people_db_client is None:
        _people_db_client = PeopleDatabaseIndexClient()
        await _people_db_client.initialize()
    return _people_db_client
