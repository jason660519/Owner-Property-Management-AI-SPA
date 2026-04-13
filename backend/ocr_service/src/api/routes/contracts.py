
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel
from typing import Optional, Any
import jwt
import datetime
import httpx
import os

from loguru import logger
from fastapi.responses import Response
from ...core.supabase_client import PeopleDatabaseSupabaseClient
from ...utils.pdf_generator import PDFGenerator

pdf_generator: Optional[PDFGenerator] = None
supabase_client: Optional[PeopleDatabaseSupabaseClient] = None

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-default-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

router = APIRouter()


class SignatureTokenPayload(BaseModel):
    contract_id: str
    signer_id: str
    exp: Any  # jwt may supply unix int; validated by PyJWT

    class Config:
        extra = "ignore"


class GenerateSignatureLinkRequest(BaseModel):
    contract_id: str
    signer_id: str
    recipient_email: str


class SignatureSubmission(BaseModel):
    signature_type: str
    signature_data: Optional[str] = None
    """Email address to receive the signed PDF notification (required for outbound mail)."""
    recipient_email: Optional[str] = None


def get_public_app_base() -> str:
    return os.environ.get("PUBLIC_APP_URL", "http://localhost:3000").rstrip("/")


def get_signature_token_payload(token: str = Query(..., description="JWT for signing session")) -> SignatureTokenPayload:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return SignatureTokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature token")
    except Exception as e:
        logger.error(f"JWT decode failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature token")


@router.post("/generate-signature-link")
async def generate_signature_link(request: GenerateSignatureLinkRequest):
    expires_delta = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "contract_id": request.contract_id,
        "signer_id": request.signer_id,
        "exp": datetime.datetime.utcnow() + expires_delta,
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    base = get_public_app_base()
    secure_link = f"{base}/sign?token={encoded_jwt}"

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_anon_key:
        logger.error("Supabase URL or Anon Key not set in environment variables.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Email service not configured")

    edge_function_url = f"{supabase_url}/functions/v1/send-signature-email"
    email_data = {
        "to_email": request.recipient_email,
        "subject": "Please sign your contract",
        "secure_link": secure_link,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                edge_function_url,
                json=email_data,
                headers={
                    "Authorization": f"Bearer {supabase_anon_key}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            logger.info(f"Email sending initiated for contract {request.contract_id} to {email_data['to_email']}")
        except httpx.RequestError as e:
            logger.error(f"Error calling Edge Function: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send email: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Edge Function returned an error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send email: {e.response.text}")

    return {"message": "Signature link generated and email sent.", "secure_link": secure_link, "token": encoded_jwt}


@router.get("/generate-pdf/{contract_id}", response_class=Response, responses={200: {"content": {"application/pdf": {}}}}, tags=["pdf"])
async def generate_contract_pdf(
    contract_id: str,
    token_data: SignatureTokenPayload = Depends(get_signature_token_payload),
):
    if pdf_generator is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF generator not initialized")
    if supabase_client is None or supabase_client.service_client is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase client not initialized")

    if token_data.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token does not match contract ID")

    response = (
        supabase_client.service_client.table("contracts")
        .select("*")
        .eq("id", contract_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    contract_data = response.data

    pdf_template_data = {
        "party_a": "",
        "party_b": "",
        "amount": f"{contract_data.get('currency')}{contract_data.get('amount')}",
        "date": contract_data.get("created_at").split("T")[0] if contract_data.get("created_at") else "N/A",
        "signer_name": "",
        "signed_at": "",
        "ip_address": "",
    }

    pdf_buffer = pdf_generator.generate_contract_pdf(pdf_template_data)

    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf")


@router.post("/sign-contract")
async def sign_contract(
    submission: SignatureSubmission,
    request: Request,
    token_data: SignatureTokenPayload = Depends(get_signature_token_payload),
):
    ip_address = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip_address = forwarded.split(",")[0].strip()
    user_agent = request.headers.get("user-agent", "unknown")

    pdf_url: Optional[str] = None

    if supabase_client is None or supabase_client.service_client is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase client not initialized")

    contract_response = (
        supabase_client.service_client.table("contracts")
        .select("*")
        .eq("id", token_data.contract_id)
        .single()
        .execute()
    )
    if not contract_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    contract_data = contract_response.data

    if pdf_generator is None:
        logger.error("PDF generator not initialized, cannot generate PDF after signing.")
    else:
        pdf_template_data = {
            "party_a": "",
            "party_b": "",
            "amount": f"{contract_data.get('currency')}{contract_data.get('amount')}",
            "date": contract_data.get("created_at").split("T")[0] if contract_data.get("created_at") else "N/A",
            "signer_name": token_data.signer_id,
            "signed_at": datetime.datetime.utcnow().isoformat(),
            "ip_address": ip_address,
        }
        pdf_buffer = pdf_generator.generate_contract_pdf(pdf_template_data)
        logger.info(f"PDF generated for contract {token_data.contract_id}. Size: {len(pdf_buffer.getvalue())} bytes")

        try:
            ts = datetime.datetime.utcnow().isoformat().replace(":", "-").replace(".", "-")
            file_name = f"signed_contracts/{token_data.contract_id}_{ts}.pdf"
            supabase_client.service_client.storage.from_("property-documents").upload(
                file_name,
                pdf_buffer.getvalue(),
                {"content-type": "application/pdf"},
            )
            pdf_url = supabase_client.service_client.storage.from_("property-documents").get_public_url(file_name)
            logger.info(f"PDF uploaded to Supabase Storage: {pdf_url}")
        except Exception as e:
            logger.error(f"Error uploading PDF to Supabase Storage: {e}")
            pdf_url = None

    try:
        signature_record = {
            "contract_id": token_data.contract_id,
            "signer_id": token_data.signer_id,
            "signature_type": submission.signature_type,
            "signature_data": submission.signature_data,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }
        ins = (
            supabase_client.service_client.table("contract_signatures")
            .insert(signature_record)
            .execute()
        )
        if ins.data:
            logger.info(f"Signature audit trail recorded for contract {token_data.contract_id} by {token_data.signer_id}")
        else:
            logger.error(f"Failed to record signature audit trail: {getattr(ins, 'error', ins)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record signature")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording signature audit trail: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to record signature: {e}")

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    raw_token = request.query_params.get("token")
    base = get_public_app_base()
    secure_link = f"{base}/sign?token={raw_token}" if raw_token else f"{base}/sign"

    if submission.recipient_email and supabase_url and supabase_anon_key:
        edge_function_url = f"{supabase_url}/functions/v1/send-signature-email"
        email_data = {
            "to_email": submission.recipient_email,
            "subject": "Your contract has been signed",
            "secure_link": secure_link,
            "pdf_url": pdf_url,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    edge_function_url,
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {supabase_anon_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )
                response.raise_for_status()
                logger.info(f"Email with signed PDF sent for contract {token_data.contract_id} to {email_data['to_email']}")
            except httpx.RequestError as e:
                logger.error(f"Error calling Edge Function to send signed PDF email: {e}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send signed PDF email: {e}")
            except httpx.HTTPStatusError as e:
                logger.error(f"Edge Function for signed PDF email returned an error: {e.response.status_code} - {e.response.text}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send signed PDF email: {e.response.text}")
    elif submission.recipient_email:
        logger.warning("Signed PDF email skipped: SUPABASE_URL or SUPABASE_ANON_KEY not configured.")
    else:
        logger.info("Signed PDF email skipped: recipient_email not provided on submission.")

    return {
        "message": "Contract signed successfully, PDF generated, stored, and email sent.",
        "contract_id": token_data.contract_id,
        "signer_id": token_data.signer_id,
        "signature_type": submission.signature_type,
        "signature_data": submission.signature_data,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "signed_at": datetime.datetime.utcnow().isoformat(),
        "pdf_url": pdf_url,
    }
