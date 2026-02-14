"""
filepath: backend/ocr_service/src/core/storage_client.py
description: Supabase Storage client for uploading and managing property documents
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import logging
import os

from supabase import Client, create_client

logger = logging.getLogger(__name__)


class SupabaseStorageClient:
    """
    Client for interacting with Supabase Storage.

    Handles file uploads to the 'property-documents' bucket with
    automatic path organization by user_id and document_id.
    """

    BUCKET_NAME = 'property-documents'

    def __init__(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set"
            )

        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("SupabaseStorageClient initialized")

    async def upload_file(
        self,
        file_data: bytes,
        user_id: str,
        document_id: str,
        filename: str = "original.pdf"
    ) -> str:
        """
        Upload file to Supabase Storage.

        Args:
            file_data: File content as bytes
            user_id: User UUID
            document_id: Document UUID
            filename: Original filename (default: original.pdf)

        Returns:
            Storage path (e.g., documents/{user_id}/{document_id}/original.pdf)

        Raises:
            Exception: If upload fails
        """
        try:
            # Construct storage path
            storage_path = f"documents/{user_id}/{document_id}/{filename}"

            # Upload to Supabase Storage
            self.client.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": "application/pdf"}
            )

            logger.info(f"File uploaded successfully: {storage_path}")
            return storage_path

        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise Exception(f"Storage upload failed: {e}") from e

    async def upload_bytes(
        self,
        file_data: bytes,
        storage_path: str,
        content_type: str
    ) -> str:
        try:
            self.client.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )

            logger.info(f"File uploaded successfully: {storage_path}")
            return storage_path
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise Exception(f"Storage upload failed: {e}") from e

    async def get_file_url(self, storage_path: str, expires_in: int = 3600) -> str:
        """
        Generate signed URL for accessing file.

        Args:
            storage_path: Path in storage (e.g., documents/{user_id}/{document_id}/original.pdf)
            expires_in: URL expiration time in seconds (default: 1 hour)

        Returns:
            Signed URL

        Raises:
            Exception: If URL generation fails
        """
        try:
            result = self.client.storage.from_(self.BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=expires_in
            )

            signed_url = result.get('signedURL')
            if not signed_url:
                raise Exception("Failed to generate signed URL")

            logger.debug(f"Generated signed URL for: {storage_path}")
            return signed_url

        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            raise Exception(f"URL generation failed: {e}") from e

    async def download_file(self, storage_path: str) -> bytes:
        """
        Download file from Supabase Storage.

        Args:
            storage_path: Path in storage

        Returns:
            File content as bytes

        Raises:
            Exception: If download fails
        """
        try:
            result = self.client.storage.from_(self.BUCKET_NAME).download(storage_path)
            logger.debug(f"Downloaded file: {storage_path}")
            return result

        except Exception as e:
            logger.error(f"Failed to download file: {e}")
            raise Exception(f"Storage download failed: {e}") from e

    async def delete_file(self, storage_path: str) -> None:
        """
        Delete file from Supabase Storage.

        Args:
            storage_path: Path in storage

        Raises:
            Exception: If deletion fails
        """
        try:
            self.client.storage.from_(self.BUCKET_NAME).remove([storage_path])
            logger.info(f"File deleted: {storage_path}")

        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            raise Exception(f"Storage deletion failed: {e}") from e


# Singleton instance
_storage_client_instance = None


def get_storage_client() -> SupabaseStorageClient:
    """
    Get or create SupabaseStorageClient singleton instance.

    Returns:
        SupabaseStorageClient instance
    """
    global _storage_client_instance
    if _storage_client_instance is None:
        _storage_client_instance = SupabaseStorageClient()
    return _storage_client_instance
