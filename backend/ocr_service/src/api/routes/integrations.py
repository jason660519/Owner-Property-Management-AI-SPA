"""
filepath: backend/ocr_service/src/api/routes/integrations.py
description: API endpoints for managing VLM API key integrations (BYOK)
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import logging
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from supabase import create_client, Client
import os

from ...core.kms import get_kms, VLMKeyKMS
from ...core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


# Pydantic models
class VLMKeyPayload(BaseModel):
    """Payload for upserting VLM API key"""
    provider: str = Field(..., pattern="^(anthropic_claude|openai_gpt4v|google_gemini)$")
    api_key: str = Field(..., min_length=10, max_length=200)
    salt_base64: str = Field(..., description="Base64-encoded random salt (16 bytes)")


class VLMKeyStatusResponse(BaseModel):
    """Response for checking VLM key status"""
    has_key: bool
    provider: Optional[str] = None
    last_used_at: Optional[str] = None


class VLMKeyUpsertResponse(BaseModel):
    """Response for upserting VLM key"""
    success: bool
    message: str
    provider: str


class VLMKeyDeleteResponse(BaseModel):
    """Response for deleting VLM key"""
    success: bool
    message: str


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


@router.post("/vlm-key", response_model=VLMKeyUpsertResponse)
async def upsert_vlm_api_key(
    payload: VLMKeyPayload,
    current_user: dict = Depends(get_current_user),
    kms: VLMKeyKMS = Depends(get_kms),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Store or update VLM API key for current user.

    Encrypts the API key using AES-GCM before storing in database.
    Only one active key per provider per user is allowed.
    """
    try:
        user_id = current_user['id']

        # Decode salt from base64
        try:
            salt = base64.b64decode(payload.salt_base64)
            if len(salt) != 16:
                raise ValueError("Salt must be 16 bytes")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid salt format: {e}"
            )

        # Encrypt API key
        encrypted = await kms.encrypt(payload.api_key, salt)

        # Deactivate existing keys for this provider
        supabase.table('user_vlm_credentials').update({
            'is_active': False
        }).eq('user_id', user_id).eq('provider', payload.provider).eq('is_active', True).execute()

        # Insert new credential
        result = supabase.table('user_vlm_credentials').insert({
            'user_id': user_id,
            'provider': payload.provider,
            'api_key_ciphertext': encrypted.ciphertext,
            'nonce': encrypted.nonce,
            'salt': salt,
            'is_active': True
        }).execute()

        logger.info(f"VLM API key upserted for user {user_id}, provider {payload.provider}")

        return VLMKeyUpsertResponse(
            success=True,
            message="API key saved successfully",
            provider=payload.provider
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upsert VLM API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save API key"
        )


@router.get("/vlm-key/status", response_model=VLMKeyStatusResponse)
async def get_vlm_key_status(
    provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Check if user has configured VLM API key.

    Args:
        provider: Optional provider filter (anthropic_claude, openai_gpt4v, google_gemini)

    Returns:
        Status indicating if key exists and when it was last used
    """
    try:
        user_id = current_user['id']

        # Build query
        query = supabase.table('user_vlm_credentials').select('provider, last_used_at').eq(
            'user_id', user_id
        ).eq('is_active', True)

        if provider:
            query = query.eq('provider', provider)

        result = query.execute()

        if result.data:
            credential = result.data[0]
            return VLMKeyStatusResponse(
                has_key=True,
                provider=credential['provider'],
                last_used_at=credential.get('last_used_at')
            )
        else:
            return VLMKeyStatusResponse(has_key=False)

    except Exception as e:
        logger.error(f"Failed to check VLM key status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check API key status"
        )


@router.delete("/vlm-key", response_model=VLMKeyDeleteResponse)
async def delete_vlm_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete VLM API key for current user.

    Args:
        provider: Provider to delete key for (anthropic_claude, openai_gpt4v, google_gemini)

    Returns:
        Success message
    """
    try:
        user_id = current_user['id']

        # Delete credential
        result = supabase.table('user_vlm_credentials').delete().eq(
            'user_id', user_id
        ).eq('provider', provider).eq('is_active', True).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )

        logger.info(f"VLM API key deleted for user {user_id}, provider {provider}")

        return VLMKeyDeleteResponse(
            success=True,
            message="API key deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete VLM API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )
