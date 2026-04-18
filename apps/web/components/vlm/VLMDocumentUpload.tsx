/**
 * @file VLMDocumentUpload.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-04
 * @modifiedBy Claude Sonnet 4.5
 */

// filepath: apps/web/components/vlm/VLMDocumentUpload.tsx
// description: Main component for VLM document upload and parsing

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Loader2, Upload, FileText, Settings } from 'lucide-react';
import { AIOperationStatusPill } from '@/components/ui/AIOperationStatusPill';
import { useOperationTimer } from '@/hooks/useOperationTimer';
import { useVLMKeyManager } from '@/hooks/useVLMKeyManager';
import { VLMApiKeyDrawer } from './VLMApiKeyDrawer';
import { ParsedResultPreview } from './ParsedResultPreview';

type UploadState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface VLMDocumentUploadProps {
  onComplete?: (data: {
    owner_name?: string;
    property_address?: string;
    building_number?: string;
    land_lot_number?: string;
  }) => void;
}

type FieldValidation = {
  is_valid: boolean;
  error_message?: string;
  confidence?: number;
};

type VLMExtractedData = {
  owner_name?: string;
  property_address?: string;
  building_number?: string;
  land_lot_number?: string;
};

type VLMParseResult = {
  extracted_data: VLMExtractedData;
  field_validations?: Record<string, FieldValidation>;
  confidence_score?: number;
  warnings?: string[];
  error_message?: string;
  status?: string;
};

type UploadResponse = {
  document_id: string;
};

const OCR_SERVICE_URL = process.env.NEXT_PUBLIC_OCR_SERVICE_URL;
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 60; // 2 minutes max

/**
 * Main component for VLM document upload and parsing
 *
 * Workflow:
 * 1. Check if user has VLM API key
 * 2. If not, show VLMApiKeyDrawer
 * 3. Allow file upload (camera or file picker)
 * 4. Upload file and start VLM parsing
 * 5. Poll for parsing status
 * 6. Display ParsedResultPreview on completion
 */
export function VLMDocumentUpload({ onComplete }: VLMDocumentUploadProps) {
  const { hasKey, checkKeyStatus, isLoading: keyLoading } = useVLMKeyManager();
  const [showKeyDrawer, setShowKeyDrawer] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [parsedData, setParsedData] = useState<VLMParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const isRunning = uploadState === 'uploading' || uploadState === 'processing';
  const operationStatus =
    isRunning ? 'running' : uploadState === 'completed' ? 'success' : uploadState === 'failed' ? 'error' : 'idle';
  const { elapsedSeconds, lastDurationSeconds, reset: resetTimer } = useOperationTimer(isRunning, { precisionDecimals: 1, tickMs: 100 });

  // Check key status on mount
  useEffect(() => {
    checkKeyStatus();
  }, [checkKeyStatus]);

  // Auto-open drawer if no key
  useEffect(() => {
    if (!keyLoading && !hasKey && uploadState === 'idle') {
      setShowKeyDrawer(true);
    }
  }, [hasKey, keyLoading, uploadState]);

  /**
   * Get auth token from Supabase session
   */
  const getAuthToken = async (): Promise<string> => {
    const session = await fetch('/api/auth/session').then((res) => res.json());
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = async (file: File) => {
    if (!OCR_SERVICE_URL) {
      setError('未設定 OCR 服務位址（NEXT_PUBLIC_OCR_SERVICE_URL）');
      setUploadState('failed');
      return;
    }

    if (!hasKey) {
      setShowKeyDrawer(true);
      return;
    }

    resetTimer();
    setUploadState('uploading');
    setError(null);

    try {
      const token = await getAuthToken();

      // Upload file to backend
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${OCR_SERVICE_URL}/api/v1/documents/upload-and-parse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json() as UploadResponse;
      setUploadState('processing');

      // Start polling for status
      pollDocumentStatus(data.document_id, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('failed');
    }
  };

  /**
   * Poll document parsing status
   */
  const pollDocumentStatus = async (docId: string, token: string) => {
    if (!OCR_SERVICE_URL) {
      setError('未設定 OCR 服務位址（NEXT_PUBLIC_OCR_SERVICE_URL）');
      setUploadState('failed');
      return;
    }

    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${OCR_SERVICE_URL}/api/v1/documents/${docId}/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json() as VLMParseResult;

        if (data.status === 'completed') {
          setParsedData(data);
          setUploadState('completed');
        } else if (data.status === 'failed') {
          setError(data.error_message || 'Parsing failed');
          setUploadState('failed');
        } else if (attempts < MAX_POLLING_ATTEMPTS) {
          attempts++;
          setPollingAttempts(attempts);
          setTimeout(poll, POLLING_INTERVAL);
        } else {
          throw new Error('Parsing timeout');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status check failed');
        setUploadState('failed');
      }
    };

    poll();
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handle auto-fill
   */
  const handleAutoFill = (mode: 'one_click' | 'selective', data: Partial<VLMExtractedData>) => {
    onComplete?.(data);
  };

  /**
   * Reset to initial state
   */
  const handleReset = () => {
    setUploadState('idle');
    setParsedData(null);
    setError(null);
    setPollingAttempts(0);
    resetTimer();
  };

  return (
    <div className="w-full space-y-4">
      {/* API Key Drawer */}
      <VLMApiKeyDrawer
        isOpen={showKeyDrawer}
        onClose={() => setShowKeyDrawer(false)}
        onSuccess={() => {
          checkKeyStatus();
        }}
      />

      {/* Main Content */}
      {uploadState === 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">智能文件掃描</h3>
                <p className="text-sm text-gray-600 mt-1">
                  上傳謄本或權狀照片，AI 將自動解析所有權人姓名和物件地址
                </p>
              </div>

              {!hasKey && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    請先設定 VLM API Key 以啟用智能掃描功能
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-center">
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="vlm-file-input"
                />
                <Button
                  onClick={() => document.getElementById('vlm-file-input')?.click()}
                  disabled={!hasKey}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  選擇檔案上傳
                </Button>
                <Button variant="outline" onClick={() => setShowKeyDrawer(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  設定 API Key
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">上傳中...</h3>
                <p className="text-sm text-gray-600">正在將文件上傳至伺服器</p>
              </div>
              <div className="flex justify-center">
                <AIOperationStatusPill
                  status={operationStatus}
                  elapsedSeconds={elapsedSeconds}
                  runningLabel="上傳中"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {uploadState === 'processing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">AI 解析中...</h3>
                <p className="text-sm text-gray-600">正在使用 VLM 解析文件內容</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <AIOperationStatusPill
                  status={operationStatus}
                  elapsedSeconds={elapsedSeconds}
                  runningLabel="AI 解析中"
                />
                <p className="text-[11px] text-gray-500">輪詢次數：{pollingAttempts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed State */}
      {uploadState === 'completed' && parsedData && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <AIOperationStatusPill
              status={operationStatus}
              summary={{ durationSeconds: lastDurationSeconds }}
              successLabel="本次解析完成"
            />
          </div>
          <ParsedResultPreview data={parsedData} onAutoFill={handleAutoFill} />
          <Button variant="outline" onClick={handleReset} className="w-full">
            重新上傳其他文件
          </Button>
        </div>
      )}

      {/* Failed State */}
      {uploadState === 'failed' && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3 flex justify-center">
              <AIOperationStatusPill
                status={operationStatus}
                summary={{ durationSeconds: lastDurationSeconds }}
                errorLabel="本次解析失敗"
              />
            </div>
            <Alert variant="destructive">
              <AlertDescription>
                <strong>解析失敗</strong>
                <p className="mt-1">{error}</p>
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleReset} className="w-full mt-4">
              重新嘗試
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
