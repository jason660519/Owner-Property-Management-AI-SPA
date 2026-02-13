from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ...core.search_client import SearchClient, get_search_client

router = APIRouter(prefix="/api/v1/search", tags=["search"])

class SearchResult(BaseModel):
    document_id: str
    owner_name: Optional[str] = None
    property_address: Optional[str] = None
    score: float
    highlight: Optional[dict] = None
    ocr_text_snippet: Optional[str] = None

class SearchResponse(BaseModel):
    total: int
    results: List[SearchResult]
    took: int

@router.get("/documents", response_model=SearchResponse)
async def search_documents(
    q: Optional[str] = Query(None, description="Fuzzy search query text"),
    owner_name: Optional[str] = Query(None, description="Filter by owner name"),
    address: Optional[str] = Query(None, description="Filter by address"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search_client: SearchClient = Depends(get_search_client)
):
    """
    Search for property documents using Elasticsearch.
    Supports fuzzy matching, owner name filtering, and address filtering.
    """
    try:
        filters = {}
        if owner_name:
            filters["owner_name"] = owner_name
        if address:
            filters["property_address"] = address

        result = await search_client.search_documents(
            query_text=q,
            filters=filters,
            limit=limit,
            offset=offset
        )

        hits = result.get('hits', {}).get('hits', [])
        total = result.get('hits', {}).get('total', {}).get('value', 0)
        took = result.get('took', 0)

        response_results = []
        for hit in hits:
            source = hit.get('_source', {})
            highlight = hit.get('highlight', {})

            # Extract snippet from highlight if available
            ocr_text_snippet = None
            if 'ocr_text' in highlight:
                ocr_text_snippet = "...".join(highlight['ocr_text'])

            response_results.append(SearchResult(
                document_id=source.get('document_id'),
                owner_name=source.get('owner_name'),
                property_address=source.get('property_address'),
                score=hit.get('_score'),
                highlight=highlight,
                ocr_text_snippet=ocr_text_snippet
            ))

        return SearchResponse(
            total=total,
            results=response_results,
            took=took
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") from e

@router.get("/stats/owner/{owner_name}")
async def get_owner_property_count(
    owner_name: str,
    search_client: SearchClient = Depends(get_search_client)
):
    """
    Get the total count of properties owned by a specific owner.
    Useful for validating the requirement: "可正確識別並計算指定屋主名下的所有房地產數量"
    """
    try:
        count = await search_client.count_properties_by_owner(owner_name)
        return {"owner_name": owner_name, "property_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
