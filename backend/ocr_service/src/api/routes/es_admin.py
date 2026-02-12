from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any
from pydantic import BaseModel
from ...core.search_client import get_search_client, SearchClient
from ...scripts.sync_es import sync_all_documents
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin/es", tags=["admin-es"])

class ClusterHealthResponse(BaseModel):
    status: str
    number_of_nodes: int
    number_of_data_nodes: int
    active_primary_shards: int
    active_shards: int
    relocating_shards: int
    initializing_shards: int
    unassigned_shards: int

class IndexStatsResponse(BaseModel):
    doc_count: int
    store_size_in_bytes: int
    index_name: str

@router.get("/health", response_model=ClusterHealthResponse)
async def get_es_health(
    search_client: SearchClient = Depends(get_search_client)
):
    """Get Elasticsearch cluster health status"""
    try:
        health = await search_client.get_cluster_health()
        return ClusterHealthResponse(
            status=health.get("status", "unknown"),
            number_of_nodes=health.get("number_of_nodes", 0),
            number_of_data_nodes=health.get("number_of_data_nodes", 0),
            active_primary_shards=health.get("active_primary_shards", 0),
            active_shards=health.get("active_shards", 0),
            relocating_shards=health.get("relocating_shards", 0),
            initializing_shards=health.get("initializing_shards", 0),
            unassigned_shards=health.get("unassigned_shards", 0)
        )
    except Exception as e:
        logger.error(f"Failed to get ES health: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=IndexStatsResponse)
async def get_es_stats(
    search_client: SearchClient = Depends(get_search_client)
):
    """Get Elasticsearch index statistics"""
    try:
        stats = await search_client.get_index_stats()
        index_name = search_client.index_name
        index_stats = stats.get("indices", {}).get(index_name, {})
        primaries = index_stats.get("primaries", {})
        
        return IndexStatsResponse(
            doc_count=primaries.get("docs", {}).get("count", 0),
            store_size_in_bytes=primaries.get("store", {}).get("size_in_bytes", 0),
            index_name=index_name
        )
    except Exception as e:
        logger.error(f"Failed to get ES stats: {e}")
        # If index doesn't exist yet, return 0
        if "index_not_found_exception" in str(e):
             return IndexStatsResponse(doc_count=0, store_size_in_bytes=0, index_name=search_client.index_name)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reindex")
async def trigger_reindex(
    background_tasks: BackgroundTasks
):
    """Trigger full reindexing of documents from Supabase to Elasticsearch"""
    background_tasks.add_task(sync_all_documents)
    return {"message": "Reindexing started in background"}
