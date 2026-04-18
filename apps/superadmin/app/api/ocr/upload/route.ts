// filepath: apps/superadmin/app/api/ocr/upload/route.ts
// created: 2026-02-13 | creator: Claude Opus 4.6
// Proxy route for OCR batch file upload — forwards to the backend OCR service

import { NextRequest, NextResponse } from 'next/server';

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL;

export async function POST(request: NextRequest) {
  if (!OCR_SERVICE_URL) {
    return NextResponse.json(
      { detail: 'OCR_SERVICE_URL is not configured' },
      { status: 503 }
    );
  }

  try {
    // Get the original form data (multipart)
    const formData = await request.formData();

    // Forward the request to the OCR service
    const ocrUrl = `${OCR_SERVICE_URL}/api/v1/ocr/batch-upload`;

    const response = await fetch(ocrUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let detail = `OCR 服務回應錯誤 (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        detail = parsed.detail || detail;
      } catch {
        // not JSON
      }
      return NextResponse.json(
        { detail },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    // Network or connection error — OCR service likely not running
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('[OCR Proxy] Upload failed:', message);

    // Distinguish between connection refused and other errors
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('fetch failed') ||
      message.includes('connect ECONNREFUSED')
    ) {
      return NextResponse.json(
        {
          detail:
            'OCR 服務未啟動或不可用，請確認 OCR_SERVICE_URL 指向可用服務',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { detail: `上傳失敗：${message}` },
      { status: 502 }
    );
  }
}
