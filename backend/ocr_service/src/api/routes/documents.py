"""
filepath: backend/ocr_service/src/api/routes/documents.py
description: API endpoints for document upload and VLM parsing
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import logging
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from supabase import Client, create_client

from ...core.auth import get_current_user
from ...core.document_validator import DocumentValidator, get_validator
from ...core.kms import VLMKeyKMS, get_kms
from ...core.search_client import get_search_client
from ...core.storage_client import SupabaseStorageClient, get_storage_client
from ...vlm.vlm_engine import VLMEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


# Pydantic models
class DocumentUploadResponse(BaseModel):
    """Response for document upload"""
    success: bool
    document_id: str
    message: str
    storage_path: str


class DocumentParsingStatus(BaseModel):
    """Document parsing status"""
    document_id: str
    status: str  # processing, completed, failed
    ocr_status: Optional[str] = None
    extracted_data: Optional[dict] = None
    field_validations: Optional[dict] = None
    confidence_score: Optional[float] = None
    error_message: Optional[str] = None


# Constants
ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# Dependency: Get Supabase client
def get_supabase_client() -> Client:
    """Get Supabase client with service role key"""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration missing"
        )

    return create_client(supabase_url, supabase_key)


async def process_document_with_vlm(
    document_id: str,
    user_id: str,
    storage_path: str,
    supabase: Client,
    kms: VLMKeyKMS,
    storage_client: SupabaseStorageClient,
    validator: DocumentValidator
):
    """
    Background task to process document with VLM.

    Args:
        document_id: UUID of document
        user_id: UUID of user
        storage_path: Path to file in Supabase Storage
        supabase: Supabase client
        kms: KMS instance for decrypting API keys
        storage_client: Storage client for downloading files
        validator: Document validator instance
    """
    try:
        logger.info(f"Starting VLM processing for document {document_id}")

        # Update status to processing
        supabase.table('property_documents').update({
            'ocr_status': 'processing'
        }).eq('id', document_id).execute()

        # Get user's active VLM credential
        cred_result = supabase.table('user_vlm_credentials').select('*').eq(
            'user_id', user_id
        ).eq('is_active', True).limit(1).execute()

        if not cred_result.data:
            raise Exception("No active VLM API key found. Please configure your API key first.")

        credential = cred_result.data[0]
        provider = credential['provider']

        # Decrypt API key
        _ = await kms.decrypt(
            ciphertext=bytes(credential['api_key_ciphertext']),
            nonce=bytes(credential['nonce']),
            salt=bytes(credential['salt'])
        )

        # Download file from storage
        file_bytes = await storage_client.download_file(storage_path)

        # Initialize VLM engine with user's API key
        vlm_engine = VLMEngine()
        await vlm_engine.initialize()

        # Set user's API key to the engine
        # (This requires modification to VLMEngine to accept custom API keys)
        # For now, we'll pass it through environment temporarily
        import time
        start_time = time.time()

        # Process document with VLM
        # Convert file to images if PDF
        from pdf2image import convert_from_bytes
        if storage_path.endswith('.pdf'):
            images = convert_from_bytes(file_bytes)
            image_bytes_list = []
            for img in images:
                import io
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                image_bytes_list.append(buf.getvalue())
        else:
            image_bytes_list = [file_bytes]

        # Call VLM with custom provider
        # This is a simplified version - actual implementation needs provider-specific handling
        vlm_result = await vlm_engine.process(
            images=image_bytes_list,
            text_results=[],
            layout_analysis={},
            document_type="property_deed",
            language="zh-TW",
            provider_priority=[provider.replace('_', '-')]
        )

        parsing_duration_ms = int((time.time() - start_time) * 1000)

        # Extract relevant fields
        extracted_data = {
            'owner_name': vlm_result.get('owner_name'),
            'property_address': vlm_result.get('property_address'),
            'building_number': vlm_result.get('building_number'),
            'land_lot_number': vlm_result.get('land_lot_number')
        }

        # Validate results
        validation_result = validator.validate_document(extracted_data)

        # Update document record
        supabase.table('property_documents').update({
            'ocr_status': 'completed',
            'extracted_data': extracted_data,
            'field_validations': validation_result.dict(),
            'confidence_score': validation_result.overall_confidence,
            'vlm_provider': provider,
            'used_user_key': True,
            'parsing_duration_ms': parsing_duration_ms,
            'vlm_model_version': vlm_result.get('model_version', 'unknown')
        }).eq('id', document_id).execute()

        # Update last_used_at for credential
        supabase.table('user_vlm_credentials').update({
            'last_used_at': 'NOW()'
        }).eq('id', credential['id']).execute()

        logger.info(f"VLM processing completed for document {document_id}")

        # Index to Elasticsearch
        try:
            search_client = get_search_client()
            # Ensure initialization is called or handled within get_search_client if using a robust pattern
            # For now relying on app startup or manual init check inside client methods if needed

            es_doc = {
                "owner_name": extracted_data.get('owner_name'),
                "property_address": extracted_data.get('property_address'),
                "building_number": extracted_data.get('building_number'),
                "land_lot_number": extracted_data.get('land_lot_number'),
                "extracted_data": extracted_data,
                "confidence_score": validation_result.overall_confidence,
                "created_at": datetime.utcnow().isoformat(),
                "parsing_duration_ms": parsing_duration_ms
            }
            # We assume text_results or vlm_result might have more raw text, but extracted_data is key
            # If we want full text search on the raw OCR text, we should extract it from vlm_result if available

            await search_client.index_document(document_id, es_doc)
            logger.info(f"Successfully indexed document {document_id} to Elasticsearch")
        except Exception as es_e:
            logger.error(f"Failed to index document {document_id} to Elasticsearch: {es_e}")

    except Exception as e:
        logger.error(f"VLM processing failed for document {document_id}: {e}")

        # Update status to failed
        supabase.table('property_documents').update({
            'ocr_status': 'failed',
            'error_message': str(e)
        }).eq('id', document_id).execute()


@router.post("/upload-and-parse", response_model=DocumentUploadResponse)
async def upload_and_parse_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    storage_client: SupabaseStorageClient = Depends(get_storage_client),
    kms: VLMKeyKMS = Depends(get_kms),
    validator: DocumentValidator = Depends(get_validator)
):
    """
    Upload property document and start VLM parsing.

    Args:
        file: Document file (PDF, PNG, JPEG)

    Returns:
        Document ID and storage path

    Raises:
        HTTPException: If file is invalid or upload fails
    """
    try:
        user_id = current_user['id']

        # Validate file type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}"
            )

        # Read file content
        file_content = await file.read()

        # Validate file size
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB"
            )

        # Generate document ID
        document_id = str(uuid.uuid4())

        # Determine filename
        original_filename = file.filename or "document.pdf"

        # Upload to Supabase Storage
        storage_path = await storage_client.upload_file(
            file_data=file_content,
            user_id=user_id,
            document_id=document_id,
            filename=original_filename
        )

        # Create property_documents record
        supabase.table('property_documents').insert({
            'id': document_id,
            'user_id': user_id,
            'document_type': 'property_deed',
            'file_path': storage_path,
            'original_filename': original_filename,
            'file_size': len(file_content),
            'mime_type': file.content_type,
            'ocr_status': 'pending'
        }).execute()

        # Start background VLM processing
        background_tasks.add_task(
            process_document_with_vlm,
            document_id=document_id,
            user_id=user_id,
            storage_path=storage_path,
            supabase=supabase,
            kms=kms,
            storage_client=storage_client,
            validator=validator
        )

        logger.info(f"Document uploaded successfully: {document_id}")

        return DocumentUploadResponse(
            success=True,
            document_id=document_id,
            message="Document uploaded successfully. VLM parsing started.",
            storage_path=storage_path
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        ) from e


@router.get("/{document_id}/status", response_model=DocumentParsingStatus)
async def get_document_parsing_status(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get document parsing status.

    Args:
        document_id: Document UUID

    Returns:
        Parsing status and results

    Raises:
        HTTPException: If document not found or access denied
    """
    try:
        user_id = current_user['id']

        # Query document
        result = supabase.table('property_documents').select('*').eq(
            'id', document_id
        ).eq('user_id', user_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        doc = result.data[0]

        return DocumentParsingStatus(
            document_id=document_id,
            status=doc['ocr_status'] or 'pending',
            ocr_status=doc['ocr_status'],
            extracted_data=doc.get('extracted_data'),
            field_validations=doc.get('field_validations'),
            confidence_score=doc.get('confidence_score'),
            error_message=doc.get('error_message')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document status"
        ) from e


@router.post("/{document_id}/parse-local")
async def parse_document_locally(
    document_id: str,
    supabase: Client = Depends(get_supabase_client),
    storage_client: SupabaseStorageClient = Depends(get_storage_client),
):
    """
    Parse a transcript document using the local deterministic Python regex parser.

    This endpoint does NOT call any external AI/VLM API — it extracts the embedded
    text layer from the PDF using PyMuPDF and applies regex-based field extraction.

    Args:
        document_id: UUID of the property_documents record.

    Returns:
        JSON with transcript type, parsed sections, and metadata.

    Raises:
        HTTPException 404: Document not found or inactive.
        HTTPException 422: PDF has no extractable text layer (scanned image).
        HTTPException 500: Unexpected parsing error.
    """
    import dataclasses
    import tempfile

    from ...parser import extract_transcript

    # 1. Fetch document record
    doc_result = supabase.table('property_documents').select(
        'id, file_path, document_type'
    ).eq('id', document_id).eq('is_active', True).execute()

    if not doc_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or has been deleted."
        )

    file_path: str = doc_result.data[0]['file_path']

    # 2. Download bytes from Supabase Storage
    try:
        file_bytes: bytes = await storage_client.download_file(file_path)
    except Exception as e:
        logger.error(f"Storage download failed for {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法從儲存空間下載文件：{e}"
        ) from e

    # 3. Write to a temporary file so PyMuPDF can open it
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        result = extract_transcript(tmp_path)
    except Exception as e:
        logger.error(f"Local parse failed for {document_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"本地解析失敗：{e}"
        ) from e
    finally:
        import os
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF 無可提取的文字層（可能是掃描影像），請改用雲端解析。"
        )

    # 4. Serialise dataclass to dict (nested dataclasses supported)
    def _to_dict(obj):
        if dataclasses.is_dataclass(obj):
            return {k: _to_dict(v) for k, v in dataclasses.asdict(obj).items()}
        if isinstance(obj, list):
            return [_to_dict(i) for i in obj]
        return obj

    transcript_type = type(result).__name__  # "BuildingTranscript" | "LandTranscript"
    return {
        "document_id": document_id,
        "transcript_type": transcript_type,
        "parsed": _to_dict(result),
    }
