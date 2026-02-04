"""
filepath: backend/ocr_service/tests/test_kms.py
description: Unit tests for VLM Key Management System (KMS)
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import os
import pytest
import asyncio
from src.core.kms import VLMKeyKMS, get_kms


class TestVLMKeyKMS:
    """Test suite for VLMKeyKMS"""

    @pytest.fixture(autouse=True)
    def setup_env(self):
        """Set up environment variable for testing"""
        # Generate test master key
        test_master_key = os.urandom(32).hex()
        os.environ['VLM_MASTER_KEY'] = test_master_key
        yield
        # Cleanup
        if 'VLM_MASTER_KEY' in os.environ:
            del os.environ['VLM_MASTER_KEY']

    @pytest.mark.asyncio
    async def test_encrypt_decrypt_round_trip(self):
        """Test encryption and decryption produce original plaintext"""
        kms = VLMKeyKMS()
        plaintext = "sk-ant-api03-test-key-1234567890"
        salt = os.urandom(16)

        # Encrypt
        encrypted = await kms.encrypt(plaintext, salt)

        # Decrypt
        decrypted = await kms.decrypt(encrypted.ciphertext, encrypted.nonce, salt)

        assert decrypted == plaintext

    @pytest.mark.asyncio
    async def test_different_salts_produce_different_ciphertexts(self):
        """Test that same plaintext with different salts produces different ciphertexts"""
        kms = VLMKeyKMS()
        plaintext = "sk-ant-api03-test-key"
        salt1 = os.urandom(16)
        salt2 = os.urandom(16)

        encrypted1 = await kms.encrypt(plaintext, salt1)
        encrypted2 = await kms.encrypt(plaintext, salt2)

        # Ciphertexts should be different
        assert encrypted1.ciphertext != encrypted2.ciphertext

        # Both should decrypt to same plaintext
        decrypted1 = await kms.decrypt(encrypted1.ciphertext, encrypted1.nonce, salt1)
        decrypted2 = await kms.decrypt(encrypted2.ciphertext, encrypted2.nonce, salt2)

        assert decrypted1 == plaintext
        assert decrypted2 == plaintext

    @pytest.mark.asyncio
    async def test_tampering_detection(self):
        """Test that tampered ciphertext fails to decrypt"""
        kms = VLMKeyKMS()
        plaintext = "sk-ant-api03-test-key"
        salt = os.urandom(16)

        encrypted = await kms.encrypt(plaintext, salt)

        # Tamper with ciphertext (flip first byte)
        tampered_ciphertext = bytearray(encrypted.ciphertext)
        tampered_ciphertext[0] ^= 0xFF
        tampered_ciphertext = bytes(tampered_ciphertext)

        # Should fail to decrypt
        with pytest.raises(ValueError, match="Failed to decrypt"):
            await kms.decrypt(tampered_ciphertext, encrypted.nonce, salt)

    @pytest.mark.asyncio
    async def test_wrong_nonce_fails(self):
        """Test that using wrong nonce fails decryption"""
        kms = VLMKeyKMS()
        plaintext = "sk-ant-api03-test-key"
        salt = os.urandom(16)

        encrypted = await kms.encrypt(plaintext, salt)

        # Use different nonce
        wrong_nonce = os.urandom(12)

        with pytest.raises(ValueError, match="Failed to decrypt"):
            await kms.decrypt(encrypted.ciphertext, wrong_nonce, salt)

    @pytest.mark.asyncio
    async def test_wrong_salt_fails(self):
        """Test that using wrong salt fails decryption"""
        kms = VLMKeyKMS()
        plaintext = "sk-ant-api03-test-key"
        salt = os.urandom(16)

        encrypted = await kms.encrypt(plaintext, salt)

        # Use different salt
        wrong_salt = os.urandom(16)

        with pytest.raises(ValueError, match="Failed to decrypt"):
            await kms.decrypt(encrypted.ciphertext, encrypted.nonce, wrong_salt)

    @pytest.mark.asyncio
    async def test_empty_plaintext(self):
        """Test encrypting empty string"""
        kms = VLMKeyKMS()
        plaintext = ""
        salt = os.urandom(16)

        encrypted = await kms.encrypt(plaintext, salt)
        decrypted = await kms.decrypt(encrypted.ciphertext, encrypted.nonce, salt)

        assert decrypted == plaintext

    @pytest.mark.asyncio
    async def test_long_plaintext(self):
        """Test encrypting long API key"""
        kms = VLMKeyKMS()
        plaintext = "sk-" + "x" * 500  # Very long key
        salt = os.urandom(16)

        encrypted = await kms.encrypt(plaintext, salt)
        decrypted = await kms.decrypt(encrypted.ciphertext, encrypted.nonce, salt)

        assert decrypted == plaintext

    def test_generate_salt(self):
        """Test salt generation produces unique values"""
        kms = VLMKeyKMS()

        salt1 = kms.generate_salt()
        salt2 = kms.generate_salt()

        assert len(salt1) == 16
        assert len(salt2) == 16
        assert salt1 != salt2

    def test_missing_master_key_raises_error(self):
        """Test that missing VLM_MASTER_KEY raises error"""
        if 'VLM_MASTER_KEY' in os.environ:
            del os.environ['VLM_MASTER_KEY']

        with pytest.raises(ValueError, match="VLM_MASTER_KEY environment variable not set"):
            VLMKeyKMS()

    def test_invalid_master_key_format(self):
        """Test that invalid VLM_MASTER_KEY format raises error"""
        os.environ['VLM_MASTER_KEY'] = "not-a-hex-string"

        with pytest.raises(ValueError, match="Invalid VLM_MASTER_KEY format"):
            VLMKeyKMS()

    def test_short_master_key_raises_error(self):
        """Test that short VLM_MASTER_KEY raises error"""
        os.environ['VLM_MASTER_KEY'] = os.urandom(16).hex()  # Only 16 bytes

        with pytest.raises(ValueError, match="VLM_MASTER_KEY must be 32 bytes"):
            VLMKeyKMS()

    def test_get_kms_singleton(self):
        """Test get_kms returns singleton instance"""
        kms1 = get_kms()
        kms2 = get_kms()

        assert kms1 is kms2
