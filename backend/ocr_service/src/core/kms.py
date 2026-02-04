"""
filepath: backend/ocr_service/src/core/kms.py
description: Key Management System for encrypting/decrypting VLM API keys using AES-GCM
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import os
import logging
from typing import NamedTuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


class EncryptedData(NamedTuple):
    """Encrypted data container"""
    ciphertext: bytes
    nonce: bytes


class VLMKeyKMS:
    """
    Key Management System for VLM API keys using AES-GCM encryption.

    Uses a master key from environment variable VLM_MASTER_KEY to derive
    encryption keys using PBKDF2 with user-specific salts.
    """

    def __init__(self):
        """Initialize KMS with master key from environment"""
        master_key_hex = os.getenv('VLM_MASTER_KEY')
        if not master_key_hex:
            raise ValueError(
                "VLM_MASTER_KEY environment variable not set. "
                "Generate one with: python -c \"import os; print(os.urandom(32).hex())\""
            )

        try:
            self.master_key = bytes.fromhex(master_key_hex)
            if len(self.master_key) != 32:
                raise ValueError("VLM_MASTER_KEY must be 32 bytes (64 hex characters)")
        except ValueError as e:
            raise ValueError(f"Invalid VLM_MASTER_KEY format: {e}")

        logger.info("VLMKeyKMS initialized successfully")

    def _derive_key(self, salt: bytes) -> bytes:
        """
        Derive encryption key from master key using PBKDF2.

        Args:
            salt: Random salt (should be 16 bytes)

        Returns:
            Derived 256-bit key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(self.master_key)

    async def encrypt(self, plaintext: str, salt: bytes) -> EncryptedData:
        """
        Encrypt plaintext using AES-GCM.

        Args:
            plaintext: API key to encrypt
            salt: Random salt (16 bytes recommended)

        Returns:
            EncryptedData with ciphertext and nonce

        Raises:
            ValueError: If encryption fails
        """
        try:
            # Derive encryption key from master key + salt
            encryption_key = self._derive_key(salt)

            # Initialize AES-GCM cipher
            aesgcm = AESGCM(encryption_key)

            # Generate random nonce (12 bytes for GCM)
            nonce = os.urandom(12)

            # Encrypt plaintext
            ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)

            logger.debug("Successfully encrypted API key")
            return EncryptedData(ciphertext=ciphertext, nonce=nonce)

        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError(f"Failed to encrypt API key: {e}")

    async def decrypt(self, ciphertext: bytes, nonce: bytes, salt: bytes) -> str:
        """
        Decrypt ciphertext using AES-GCM.

        Args:
            ciphertext: Encrypted data
            nonce: Nonce used during encryption
            salt: Salt used to derive key

        Returns:
            Decrypted plaintext API key

        Raises:
            ValueError: If decryption fails (e.g., tampered data)
        """
        try:
            # Derive encryption key from master key + salt
            encryption_key = self._derive_key(salt)

            # Initialize AES-GCM cipher
            aesgcm = AESGCM(encryption_key)

            # Decrypt ciphertext
            plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)

            logger.debug("Successfully decrypted API key")
            return plaintext_bytes.decode('utf-8')

        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError("Failed to decrypt API key. Data may be corrupted or tampered.")

    def generate_salt(self) -> bytes:
        """
        Generate cryptographically secure random salt.

        Returns:
            16-byte random salt
        """
        return os.urandom(16)


# Singleton instance
_kms_instance = None


def get_kms() -> VLMKeyKMS:
    """
    Get or create KMS singleton instance.

    Returns:
        VLMKeyKMS instance
    """
    global _kms_instance
    if _kms_instance is None:
        _kms_instance = VLMKeyKMS()
    return _kms_instance
