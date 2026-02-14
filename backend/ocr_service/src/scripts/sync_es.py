import asyncio
import os
import sys
from datetime import datetime

from loguru import logger
from supabase import create_client

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

from src.core.search_client import get_search_client


async def sync_all_documents():
    """
    Sync all completed documents from Supabase to Elasticsearch
    """
    # Initialize Supabase
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        logger.error("Supabase configuration missing")
        return

    supabase = create_client(supabase_url, supabase_key)

    # Initialize Search Client
    search_client = get_search_client()
    try:
        await search_client.initialize()
    except Exception as e:
        logger.error(f"Failed to connect to Elasticsearch: {e}")
        return

    # Fetch all completed documents
    # Using simple pagination
    offset = 0
    limit = 100
    total_synced = 0

    while True:
        logger.info(f"Fetching documents offset={offset} limit={limit}")
        response = supabase.table('property_documents').select('*').eq('ocr_status', 'completed').range(offset, offset + limit - 1).execute()

        documents = response.data
        if not documents:
            break

        for doc in documents:
            try:
                extracted_data = doc.get('extracted_data', {})
                if not extracted_data:
                    continue

                es_doc = {
                    "owner_name": extracted_data.get('owner_name'),
                    "property_address": extracted_data.get('property_address'),
                    "building_number": extracted_data.get('building_number'),
                    "land_lot_number": extracted_data.get('land_lot_number'),
                    "extracted_data": extracted_data,
                    "confidence_score": doc.get('confidence_score'),
                    "created_at": doc.get('created_at', datetime.utcnow().isoformat()),
                    "parsing_duration_ms": doc.get('parsing_duration_ms')
                }

                await search_client.index_document(doc['id'], es_doc)
                total_synced += 1
            except Exception as e:
                logger.error(f"Failed to sync document {doc.get('id')}: {e}")

        offset += limit

    logger.info(f"Sync completed. Total documents synced: {total_synced}")
    await search_client.close()

if __name__ == "__main__":
    asyncio.run(sync_all_documents())
