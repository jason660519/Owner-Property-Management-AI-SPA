
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
import jwt
import datetime
import httpx # For making HTTP requests to Supabase Edge Function
import os # To access environment variables

from loguru import logger
from fastapi.responses import Response
from ..core.supabase_client import SupabaseClient # Import SupabaseClient
from ..utils.pdf_generator import PDFGenerator # Import PDFGenerator

pdf_generator: Optional[PDFGenerator] = None # Will be set during app startup
supabase_client: Optional[SupabaseClient] = None # Will be set during app startup

# --- Configuration (Move to config file later) ---
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-default-key") # TODO: Ensure this is set securely in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours for signature links

router = APIRouter()

class SignatureTokenPayload(BaseModel):
    contract_id: str
    signer_id: str
    exp: datetime.datetime

class GenerateSignatureLinkRequest(BaseModel):
    contract_id: str
    signer_id: str
    recipient_email: str

class SignatureSubmission(BaseModel):
    signature_type: str
    signature_data: Optional[str]
    # IP address and user agent will be extracted from request

# Dependency to get current user ID (assuming it's available via auth.uid() in Supabase or similar)
async def get_current_user_id():
    # This is a placeholder. Actual implementation will depend on auth system.
    # For now, let's assume it's passed in headers for development/testing.
    return "test-user-id"

# Dependency to validate signature token
async def get_valid_signature_token(token: str): # TODO: Get token from query param or header
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = SignatureTokenPayload(**payload)
        return token_data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature token")

@router.post("/generate-signature-link")
async def generate_signature_link(request: GenerateSignatureLinkRequest):
    expires_delta = datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "contract_id": request.contract_id,
        "signer_id": request.signer_id,
        "exp": datetime.datetime.utcnow() + expires_delta
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    secure_link = f"http://your-app.com/sign?token={encoded_jwt}" # TODO: Use actual app URL from config

    # Get Supabase URL and anon key from environment variables
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        logger.error("Supabase URL or Anon Key not set in environment variables.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Email service not configured")

    # Call Supabase Edge Function to send email
    edge_function_url = f"{SUPABASE_URL}/functions/v1/send-signature-email"
    email_data = {
        "to_email": request.recipient_email, # Use dynamic recipient email
        "subject": "Please sign your contract",
        "secure_link": secure_link
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                edge_function_url,
                json=email_data,
                headers={
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10.0
            )
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            logger.info(f"Email sending initiated for contract {request.contract_id} to {email_data['to_email']}")
        except httpx.RequestError as e:
            logger.error(f"Error calling Edge Function: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send email: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Edge Function returned an error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send email: {e.response.text}")

    return {"message": "Signature link generated and email sent.", "secure_link": secure_link, "token": encoded_jwt}

@router.get("/generate-pdf/{contract_id}", response_class=Response, responses={200: {"content": {"application/pdf": {}}}}, tags=["pdf"])
async def generate_contract_pdf(contract_id: str, token_data: SignatureTokenPayload = Depends(get_valid_signature_token)):
    if pdf_generator is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF generator not initialized")
    if supabase_client is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase client not initialized")

    if token_data.contract_id != contract_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token does not match contract ID")

    # Fetch actual contract data from database
    response = await supabase_client.from_("contracts").select("*").eq("id", contract_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    contract_data = response.data
    
    # Prepare data for PDF template (adjust as needed based on contract_template.html)
    pdf_template_data = {
        "party_a": "", # TODO: Fetch actual party names from auth.users or profiles
        "party_b": "", # TODO: Fetch actual party names from auth.users or profiles
        "amount": f"{contract_data.get("currency")}{contract_data.get("amount")}",
        "date": contract_data.get("created_at").split("T")[0] if contract_data.get("created_at") else "N/A",
        "signer_name": "", # This will be set dynamically upon signing
        "signed_at": "", # This will be set dynamically upon signing
        "ip_address": "" # This will be set dynamically upon signing
    }

    pdf_buffer = pdf_generator.generate_contract_pdf(pdf_template_data)

    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf")

@router.post("/sign-contract")
async def sign_contract(submission: SignatureSubmission, request: Request, token_data: SignatureTokenPayload = Depends(get_valid_signature_token)):
    # TODO: Get IP address and user agent from request
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if supabase_client is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase client not initialized")

    # Fetch actual contract data for PDF generation and validation
    contract_response = await supabase_client.from_("contracts").select("*").eq("id", token_data.contract_id).single().execute()
    if not contract_response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    contract_data = contract_response.data

    if pdf_generator is None:
        logger.error("PDF generator not initialized, cannot generate PDF after signing.")
        pdf_url = None
    else:
        # Prepare data for PDF template
        pdf_template_data = {
            "party_a": "", # TODO: Fetch actual party names from auth.users or profiles
            "party_b": "", # TODO: Fetch actual party names from auth.users or profiles
            "amount": f"{contract_data.get("currency")}{contract_data.get("amount")}",
            "date": contract_data.get("created_at").split("T")[0] if contract_data.get("created_at") else "N/A",
            "signer_name": token_data.signer_id, # Using signer_id as name for now
            "signed_at": datetime.datetime.utcnow().isoformat(),
            "ip_address": ip_address
        }
        pdf_buffer = pdf_generator.generate_contract_pdf(pdf_template_data)
        logger.info(f"PDF generated for contract {token_data.contract_id}. Size: {len(pdf_buffer.getvalue())} bytes")
        
        # Upload PDF to Supabase Storage
        if supabase_client is None:
            logger.error("Supabase client not initialized, cannot upload PDF.")
            pdf_url = None
        else:
            try:
                file_name = f"signed_contracts/{token_data.contract_id}_{datetime.datetime.utcnow().isoformat().replace(":","-").replace(".","-")}.pdf"
                response = await supabase_client.storage.from_("property-documents").upload(file_name, pdf_buffer.getvalue(), {"content-type": "application/pdf"})
                if response.data:
                    pdf_url = supabase_client.storage.from_("property-documents").get_public_url(file_name)
                    logger.info(f"PDF uploaded to Supabase Storage: {pdf_url}")
                else:
                    logger.error(f"Failed to upload PDF to Supabase Storage: {response.error}")
                    pdf_url = None
            except Exception as e:
                logger.error(f"Error uploading PDF to Supabase Storage: {e}")
                pdf_url = None
    
    # Record signature audit trail in Supabase
    if supabase_client is None:
        logger.error("Supabase client not initialized, cannot record signature audit trail.")
    else:
        try:
            signature_record = {
                "contract_id": token_data.contract_id,
                "signer_id": token_data.signer_id,
                "signature_type": submission.signature_type,
                "signature_data": submission.signature_data,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
            response = await supabase_client.from_("contract_signatures").insert([signature_record]).execute()
            if response.data:
                logger.info(f"Signature audit trail recorded for contract {token_data.contract_id} by {token_data.signer_id}")
            else:
                logger.error(f"Failed to record signature audit trail: {response.error}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record signature")
        except Exception as e:
            logger.error(f"Error recording signature audit trail: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to record signature: {e}")

    # Call Supabase Edge Function to send email
    edge_function_url = f"{SUPABASE_URL}/functions/v1/send-signature-email" # SUPABASE_URL must be defined
    email_data = {
        "to_email": request.recipient_email, # Use dynamic recipient email
        "subject": "Your contract has been signed", # Updated subject
        "secure_link": secure_link, # Still include the original secure link in case they need to re-verify
        "pdf_url": pdf_url # Pass PDF URL to Edge Function
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                edge_function_url,
                json=email_data,
                headers={
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}", # SUPABASE_ANON_KEY must be defined
                    "Content-Type": "application/json",
                },
                timeout=10.0
            )
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            logger.info(f"Email with signed PDF sent for contract {token_data.contract_id} to {email_data['to_email']}")
        except httpx.RequestError as e:
            logger.error(f"Error calling Edge Function to send signed PDF email: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send signed PDF email: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Edge Function for signed PDF email returned an error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send signed PDF email: {e.response.text}")

    return {
        "message": "Contract signed successfully, PDF generated, stored, and email sent.",
        "contract_id": token_data.contract_id,
        "signer_id": token_data.signer_id,
        "signature_type": submission.signature_type,
        "signature_data": submission.signature_data,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "signed_at": datetime.datetime.utcnow().isoformat(),
        "pdf_url": pdf_url
    }
