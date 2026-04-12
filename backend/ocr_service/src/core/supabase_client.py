"""
Supabase client for People Database operations
"""
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from loguru import logger
import asyncio
from datetime import datetime
import uuid


class PeopleDatabaseSupabaseClient:
    """Async Supabase client for people database operations"""
    
    def __init__(self):
        self.supabase_url = os.getenv(
            "SUPABASE_URL",
            "http://127.0.0.1:54321"
        )
        self.supabase_key = os.getenv(
            "SUPABASE_ANON_KEY",
            ""
        )
        self.service_key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY",
            ""
        )
        self.client: Optional[Client] = None
        self.service_client: Optional[Client] = None
    
    async def initialize(self):
        """Initialize Supabase clients"""
        try:
            if not self.supabase_url:
                raise ValueError("SUPABASE_URL is required")
            if not self.supabase_key:
                raise ValueError("SUPABASE_ANON_KEY is required")
            if not self.service_key:
                raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

            # Anon client for user-level operations
            self.client = create_client(self.supabase_url, self.supabase_key)
            
            # Service role client for backend operations (bypasses RLS)
            self.service_client = create_client(self.supabase_url, self.service_key)
            
            logger.info("Supabase clients initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase clients: {e}")
            raise
    
    async def create_import_batch(
        self,
        label: str,
        data_source: str,
        total_records: int,
        imported_by_user_id: str,
        field_mapping: Dict[str, Any]
    ) -> str:
        """
        Create import batch record in PostgreSQL
        
        Returns:
            batch_id (str): UUID of created batch
        """
        try:
            batch_id = str(uuid.uuid4())
            
            response = self.service_client.table('import_batches').insert({
                'id': batch_id,
                'label': label,
                'description': f"column_mapping={field_mapping}",
                'data_source': data_source,
                'status': 'pending',
                'total_records': total_records,
                'processed_records': 0,
                'skipped_records': 0,
                'error_message': None,
                'imported_by': imported_by_user_id,
            }).execute()
            
            logger.info(f"Created import batch {batch_id}")
            return batch_id
        except Exception as e:
            logger.error(f"Failed to create import batch: {e}")
            raise
    
    async def get_import_status(self, batch_id: str) -> Dict[str, Any]:
        """
        Get status of import batch
        
        Returns:
            Dictionary with batch status information
        """
        try:
            response = self.service_client.table('import_batches').select(
                '*'
            ).eq('id', batch_id).execute()
            
            if not response.data:
                logger.warning(f"Batch {batch_id} not found")
                raise Exception(f"Batch {batch_id} not found")
            
            batch = response.data[0]
            
            return {
                'batch_id': batch['id'],
                'status': batch['status'],
                'total_records': batch['total_records'],
                'processed_records': batch['processed_records'],
                'error_records': batch.get('skipped_records', 0),
                'percentage': int((batch['processed_records'] / max(batch['total_records'], 1)) * 100),
                'error_message': batch['error_message'],
                'started_at': batch.get('created_at'),
                'completed_at': batch.get('updated_at') if batch.get('status') in ('completed', 'failed', 'rolled_back') else None,
            }
        except Exception as e:
            logger.error(f"Failed to get batch status: {e}")
            raise

    async def list_recent_import_batches(self, limit: int = 20) -> list[Dict[str, Any]]:
        """List latest import batches for import history visualization."""
        try:
            safe_limit = max(1, min(limit, 200))
            response = (
                self.service_client
                .table('import_batches')
                .select(
                    'id,label,data_source,status,total_records,processed_records,skipped_records,imported_by,created_at,updated_at,error_message'
                )
                .order('created_at', desc=True)
                .limit(safe_limit)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Failed to list recent import batches: {e}")
            raise
    
    async def update_import_status(
        self,
        batch_id: str,
        status: str,
        processed_records: int,
        error_records: int,
        error_message: Optional[str] = None
    ):
        """Update import batch status"""
        try:
            update_data = {
                'status': status,
                'processed_records': processed_records,
                'skipped_records': error_records
            }
            
            if error_message:
                update_data['error_message'] = error_message
            
            response = self.service_client.table('import_batches').update(
                update_data
            ).eq('id', batch_id).execute()
            
            logger.info(f"Updated batch {batch_id} status to {status}")
        except Exception as e:
            logger.error(f"Failed to update batch status: {e}")
            raise
    
    async def create_people_record(
        self,
        batch_id: str,
        name: str,
        id_number: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        organization: Optional[str] = None,
        title_position: Optional[str] = None,
        data_source: str = "unknown",
        ocr_confidence: float = 1.0,
        quality_score: float = 0.5
    ) -> str:
        """
        Create people record in PostgreSQL
        
        Returns:
            record_id (str): UUID of created record
        """
        try:
            record_id = str(uuid.uuid4())
            
            response = self.service_client.table('people_records').insert({
                'id': record_id,
                'import_batch_id': batch_id,
                'name': name,
                'id_number': id_number,
                'phone': phone,
                'address': address,
                'organization': organization,
                'title_position': title_position,
                'data_source': data_source,
                'ocr_confidence': ocr_confidence,
                'quality_score': quality_score,
                'duplicate_flag': False,
                'imported_by': 'system',  # Will be set from context
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }).execute()
            
            return record_id
        except Exception as e:
            logger.error(f"Failed to create people record: {e}")
            raise
    
    async def search_people_records(
        self,
        query: Optional[str] = None,
        data_sources: Optional[list] = None,
        min_quality_score: float = 0.0,
        min_ocr_confidence: float = 0.0,
        exclude_duplicates: bool = True,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search people records from PostgreSQL"""
        try:
            # Build query
            sql_query = self.service_client.table('people_records').select('*')
            
            # Apply filters
            if min_quality_score > 0:
                sql_query = sql_query.gte('quality_score', min_quality_score)
            
            if min_ocr_confidence > 0:
                sql_query = sql_query.gte('ocr_confidence', min_ocr_confidence)
            
            if exclude_duplicates:
                sql_query = sql_query.eq('duplicate_flag', False)
            
            if data_sources:
                # Filter by any of the data sources
                sql_query = sql_query.in_('data_source', data_sources)
            
            # Add pagination
            sql_query = sql_query.limit(limit).offset(offset)
            
            response = sql_query.execute()
            
            return {
                'records': response.data,
                'count': len(response.data)
            }
        except Exception as e:
            logger.error(f"Failed to search records: {e}")
            raise


# Global instance
_supabase_client: Optional[PeopleDatabaseSupabaseClient] = None


def get_supabase_client() -> PeopleDatabaseSupabaseClient:
    """Get or create Supabase client (dependency injection)"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = PeopleDatabaseSupabaseClient()
    return _supabase_client


async def initialize_supabase_client():
    """Initialize Supabase client on startup"""
    client = get_supabase_client()
    await client.initialize()
