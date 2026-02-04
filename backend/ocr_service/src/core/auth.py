"""
filepath: backend/ocr_service/src/core/auth.py
description: Authentication utilities for extracting current user from JWT
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import os
import logging
from typing import Optional
from fastapi import HTTPException, status, Header
from jose import jwt, JWTError

logger = logging.getLogger(__name__)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Extract and validate current user from Authorization header.

    Args:
        authorization: JWT token from Authorization header (Bearer <token>)

    Returns:
        User dict with 'id', 'email', etc.

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise ValueError("Invalid authentication scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected: Bearer <token>"
        )

    # Decode JWT token
    try:
        jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
        if not jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET environment variable not set")

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=['HS256'],
            options={"verify_aud": False}
        )

        # Extract user info
        user_id = payload.get('sub')
        email = payload.get('email')

        if not user_id:
            raise ValueError("Token missing 'sub' claim")

        return {
            'id': user_id,
            'email': email,
            'role': payload.get('role'),
            'aud': payload.get('aud')
        }

    except JWTError as e:
        logger.error(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    except Exception as e:
        logger.error(f"Failed to decode token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )
