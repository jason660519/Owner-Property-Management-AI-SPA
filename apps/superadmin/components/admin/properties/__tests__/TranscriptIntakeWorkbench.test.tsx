import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/actions/properties', () => ({
  deletePropertyDocument: jest.fn(),
  uploadPropertyDocument: jest.fn(),
}));

import { TranscriptIntakeWorkbench } from '../TranscriptIntakeWorkbench';
import { deletePropertyDocument, uploadPropertyDocument } from '@/lib/actions/properties';
import type { PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';

const property = {
  id: 'property-1',
  type: 'sale',
  ownerId: 'owner-1',
  title: '測試物件',
  address: '',
  status: 'draft',
  price: null,
  monthlyRent: null,
  ownerName: null,
  area: null,
  propertyType: null,
  bedrooms: null,
  bathrooms: null,
  livingRooms: null,
  parkingSpaces: null,
  createdAt: '',
  updatedAt: '',
} as PropertyItem;

const transcriptDoc: PropertyDocumentItem = {
  id: 'doc-1',
  documentType: 'building_registry_transcript',
  documentName: '建物謄本.pdf',
  filePath: 'property-1/building.pdf',
  url: '/api/documents/doc-1/view',
};

const landTranscriptDoc: PropertyDocumentItem = {
  id: 'doc-2',
  documentType: 'land_registry_transcript',
  documentName: '土地謄本.pdf',
  filePath: 'property-1/land.pdf',
  url: '/api/documents/doc-2/view',
};

const buildingTitleDoc: PropertyDocumentItem = {
  id: 'doc-title',
  documentType: 'building_title',
  documentName: '屋主建物權狀影本.jpg',
  filePath: 'property-1/title.jpg',
  url: '/api/documents/doc-title/view',
};

const localTextRouteDecision = {
  aggregateRoute: 'local_python_text',
  documents: [{
    documentId: 'doc-1',
    documentName: '建物謄本.pdf',
    route: 'local_python_text',
    reasons: ['PDF text layer contains enough Taiwanese registry markers for local parsing.'],
    metrics: {
      extractedTextLength: 1200,
      cjkCharacterCount: 760,
      registryMarkerCount: 8,
    },
    pdfTextProbe: {
      pageCount: 2,
      likelyScanned: false,
    },
  }],
};

const tracedParsedResult = {
  aiStageTrace: [
    {
      stage: 'detect',
      label: 'Detect 初判',
      status: 'success',
      engine: 'vlm_ai',
      durationMs: 1300,
      agentKey: 'transcript_detection',
      moduleKey: 'transcript.intake.detect',
      promptSource: 'ai_system_prompt',
      models: [{ provider: 'openai', model: 'gpt-4.1', role: 'detect' }],
      confidence: null,
      summary: ['物件型態：unit_building_with_land_share_sale'],
      corrections: [],
      warnings: [],
    },
    {
      stage: 'parse',
      label: 'Parse 正式擷取',
      status: 'success',
      engine: 'local_python_text',
      durationMs: 2200,
      agentKey: null,
      moduleKey: null,
      promptSource: null,
      models: [{ provider: 'local', model: 'local-python-text', role: 'local', durationMs: 42 }],
      confidence: null,
      summary: ['完成 1/1 份文件解析'],
      corrections: [],
      warnings: [],
    },
    {
      stage: 'verify_review',
      label: 'Verify / Review 驗證審查',
      status: 'success',
      engine: 'vlm_ai',
      durationMs: 3400,
      agentKey: 'transcript_audit',
      moduleKey: 'transcript.intake.review',
      promptSource: 'ai_system_prompt',
      models: [{ provider: 'anthropic', model: 'claude-sonnet-4-5', role: 'review' }],
      confidence: 0.85,
      summary: ['審核結果：需人工確認'],
      corrections: ['documents[0].ownerName 建議改為 凌建堂'],
      warnings: ['warning: 土地與建物所有權人不同'],
    },
    {
      stage: 'detail_builder',
      label: 'Detail Builder 明細草稿',
      status: 'success',
      engine: 'vlm_ai',
      durationMs: 1800,
      agentKey: 'transcript_detail_builder',
      moduleKey: 'transcript.intake.detail_builder',
      promptSource: 'ai_system_prompt',
      models: [{ provider: 'gemini', model: 'gemini-3.1-pro-preview', role: 'detail_builder', durationMs: 1800 }],
      confidence: 0.9,
      summary: ['建物明細 1 列'],
      corrections: ['產生明細草稿：建物 1 列、土地 0 列、車位建物 0 列、車位土地 0 列'],
      warnings: [],
    },
  ],
  areaDetailDraft: {
    version: 1,
    dispositionKind: 'unit_building_with_land_share_sale',
    parkingTitleRights: [],
    buildingAreas: [{
      id: 'detail-building-1',
      label: '主建物',
      identifier: '001建號',
      areaSqm: '88.5',
      shareRatio: '全部',
      use: '住家用',
      evidenceText: '001建號 / 88.5',
      confidence: 0.9,
    }],
    landShareAreas: [],
    parkingBuildingAreas: [],
    parkingLandShareAreas: [],
  },
};

function mockFetch() {
  const calls: Array<{ url: string; body?: unknown }> = [];
  jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    const href = typeof url === 'string' ? url : String(url);
    calls.push({
      url: href,
      body: options?.body ? JSON.parse(options.body as string) as unknown : undefined,
    });

    if (href.startsWith('/api/transcript-intake/runs?')) {
      return Response.json({ runs: [] });
    }
    if (href === '/api/transcript-intake/runs' && options?.method === 'POST') {
      return Response.json({
        run: {
          id: 'run-1',
          status: 'route_selected',
          currentPhase: 'route_selected',
          routeDecision: localTextRouteDecision,
          detectionResult: {},
          parsedResult: {},
          reviewResult: {},
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      });
    }
    if (href === '/api/transcript-intake/runs/run-1/process') {
      return Response.json({ accepted: true, runId: 'run-1' });
    }
    if (href === '/api/transcript-intake/runs/run-1') {
      if (options?.method === 'POST') {
        return Response.json({
          run: {
            id: 'run-1',
            status: 'confirmed',
            currentPhase: 'confirmed',
            routeDecision: localTextRouteDecision,
            detectionResult: { dispositionKind: 'pure_land_sale' },
            parsedResult: {},
            reviewResult: { approved: true, confidence: 0.9 },
            errorMessage: null,
            createdAt: '',
            updatedAt: '',
            completedAt: '',
          },
        });
      }
      return Response.json({
        run: {
          id: 'run-1',
          status: 'needs_user_confirmation',
          currentPhase: 'needs_user_confirmation',
          routeDecision: localTextRouteDecision,
          detectionResult: {},
          parsedResult: tracedParsedResult,
          reviewResult: { confidence: 0.85 },
          errorMessage: null,
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      });
    }
    return new Response(null, { status: 404 });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('TranscriptIntakeWorkbench', () => {
  it('shows an empty state when no transcript documents are uploaded', async () => {
    mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[]} />);

    expect(screen.getByText('謄本工作台')).toBeInTheDocument();
    expect(await screen.findByText(/先上傳謄本文件/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /建立並判讀/ })).toBeDisabled();
  });

  it('shows an elapsed timer while transcript parsing is running', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const href = typeof url === 'string' ? url : String(url);
      if (href.startsWith('/api/transcript-intake/runs?')) {
        return Response.json({
          runs: [{
            id: 'run-1',
            status: 'parsing',
            currentPhase: 'parsing',
            routeDecision: {},
            detectionResult: {},
            parsedResult: {
              aiStageTrace: [{
                stage: 'detect',
                label: 'Detect 初判',
                status: 'success',
                engine: 'vlm_ai',
                durationMs: 1200,
                models: [{ provider: 'openai', model: 'gpt-4.1', role: 'detect' }],
                summary: ['初判完成'],
                corrections: [],
                warnings: [],
              }],
            },
            reviewResult: {},
            errorMessage: null,
            createdAt: new Date().toISOString(),
            updatedAt: '',
            completedAt: null,
          }],
        });
      }
      if (href === '/api/transcript-intake/runs/run-1') return Response.json({ run: null });
      return new Response(null, { status: 404 });
    });

    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc]} />);

    expect(await screen.findByText('系統正在解析')).toBeInTheDocument();
    expect(screen.getByText('Detect 初判')).toBeInTheDocument();
    expect(screen.getByText('Parse 正式擷取')).toBeInTheDocument();
    expect(screen.getByText('Verify / Review 驗證審查')).toBeInTheDocument();
    expect(screen.getByText('處理中 · vlm_ai')).toBeInTheDocument();
    expect(screen.getAllByText(/已花費/).length).toBeGreaterThanOrEqual(2);
  });

  it('creates a run and starts processing with all transcript document ids', async () => {
    const calls = mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc]} />);

    fireEvent.click(await screen.findByRole('button', { name: /建立並判讀/ }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === '/api/transcript-intake/runs/run-1/process')).toBe(true);
    });
    const createCall = calls.find((call) => call.url === '/api/transcript-intake/runs');
    expect(createCall?.body).toMatchObject({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    });
    expect(await screen.findByText('本地文字層（Python / pdftotext）')).toBeInTheDocument();
    expect(screen.getByText('2 頁 / 文字 1200 / 繁中 760 / 謄本標記 8')).toBeInTheDocument();
    expect(await screen.findByText('AI 品質追蹤')).toBeInTheDocument();
    expect(screen.getByText('detect: openai/gpt-4.1')).toBeInTheDocument();
    expect(screen.getByText('local: local/local-python-text')).toBeInTheDocument();
    expect(screen.getByText('review: anthropic/claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByText('detail_builder: gemini/gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText('documents[0].ownerName 建議改為 凌建堂')).toBeInTheDocument();
    expect(screen.getByText('花費 1.3 秒')).toBeInTheDocument();
    expect(screen.getByText('花費 2.2 秒')).toBeInTheDocument();
    expect(screen.getByText('花費 3.4 秒')).toBeInTheDocument();
    expect(screen.getByDisplayValue('001建號')).toBeInTheDocument();
  });

  it('creates a run only with checked transcript document ids', async () => {
    const calls = mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc, landTranscriptDoc]} />);

    expect(await screen.findByLabelText('納入解析 建物謄本.pdf')).toBeChecked();
    expect(screen.getByLabelText('納入解析 土地謄本.pdf')).toBeChecked();
    fireEvent.click(screen.getByLabelText('納入解析 土地謄本.pdf'));
    fireEvent.click(screen.getByRole('button', { name: /建立並判讀/ }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === '/api/transcript-intake/runs/run-1/process')).toBe(true);
    });
    const createCall = calls.find((call) => call.url === '/api/transcript-intake/runs');
    expect(createCall?.body).toMatchObject({
      propertyId: 'property-1',
      propertyType: 'sale',
      documentIds: ['doc-1'],
    });
  });

  it('includes owner title deed copies in the intake selection', async () => {
    const calls = mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[buildingTitleDoc]} />);

    expect(await screen.findByText(/已上傳 1 份謄本／權狀/)).toBeInTheDocument();
    expect(screen.getByLabelText('納入解析 屋主建物權狀影本.jpg')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /建立並判讀/ }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === '/api/transcript-intake/runs/run-1/process')).toBe(true);
    });
    expect(calls.find((call) => call.url === '/api/transcript-intake/runs')?.body).toMatchObject({
      documentIds: ['doc-title'],
    });
  });

  it('uploads an unclassified transcript from the workbench entry', async () => {
    mockFetch();
    const onDocumentsChanged = jest.fn(async () => undefined);
    jest.mocked(uploadPropertyDocument).mockResolvedValue({
      success: true,
      message: '文件已上傳',
    });
    const { container } = render(
      <TranscriptIntakeWorkbench
        property={property}
        documents={[transcriptDoc]}
        onDocumentsChanged={onDocumentsChanged}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
    const file = new File(['{"kind":"land"}'], '謄本.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    const uploadButton = screen.getByRole('button', { name: /^上傳謄本$/ });
    await waitFor(() => {
      expect(uploadButton).not.toBeDisabled();
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(uploadPropertyDocument).toHaveBeenCalledWith(
        'property-1',
        'sale',
        'owner-1',
        'registry_transcript_unclassified',
        expect.any(FormData),
      );
    });
    expect(onDocumentsChanged).toHaveBeenCalledTimes(1);
  });

  it('lets users remove an incorrectly uploaded transcript with confirmation', async () => {
    mockFetch();
    const onDocumentsChanged = jest.fn(async () => undefined);
    jest.mocked(deletePropertyDocument).mockResolvedValue({
      success: true,
      message: '文件已刪除',
    });
    render(
      <TranscriptIntakeWorkbench
        property={property}
        documents={[transcriptDoc]}
        onDocumentsChanged={onDocumentsChanged}
      />
    );

    const deleteButton = await screen.findByTitle('刪除文件');
    fireEvent.click(deleteButton);
    const confirmButton = await screen.findByRole('button', { name: /確認刪除/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deletePropertyDocument).toHaveBeenCalledWith('doc-1', 'property-1/building.pdf');
    });
    expect(await screen.findByText('謄本文件已刪除')).toBeInTheDocument();
    expect(onDocumentsChanged).toHaveBeenCalledTimes(1);
  });

  it('syncs uploaded transcript selection with the document preview', async () => {
    mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc, landTranscriptDoc]} />);

    expect(await screen.findByTitle('謄本預覽：建物謄本.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '預覽 土地謄本.pdf' }));

    expect(await screen.findByTitle('謄本預覽：土地謄本.pdf')).toBeInTheDocument();
    expect(screen.getByText('第 2/2 份：土地謄本.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('預覽中')).toHaveLength(2);
  });

  it('keeps preview badges and preview range aligned with checked documents', async () => {
    mockFetch();
    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc, landTranscriptDoc]} />);

    expect(await screen.findByText('第 1/2 份：建物謄本.pdf')).toBeInTheDocument();
    expect(screen.getByTitle('謄本預覽：土地謄本.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('預覽中')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('納入解析 建物謄本.pdf'));

    expect(await screen.findByText('第 1/1 份：土地謄本.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '預覽 建物謄本.pdf' })).toBeDisabled();
    expect(screen.queryByTitle('謄本預覽：建物謄本.pdf')).not.toBeInTheDocument();
    expect(screen.getByTitle('謄本預覽：土地謄本.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('預覽中')).toHaveLength(1);
  });

  it('confirms a run that is waiting for user confirmation', async () => {
    const calls = mockFetch();
    jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const href = typeof url === 'string' ? url : String(url);
      calls.push({
        url: href,
        body: options?.body ? JSON.parse(options.body as string) as unknown : undefined,
      });
      if (href.startsWith('/api/transcript-intake/runs?')) {
        return Response.json({
          runs: [{
            id: 'run-1',
            status: 'needs_user_confirmation',
            currentPhase: 'needs_user_confirmation',
            routeDecision: localTextRouteDecision,
            detectionResult: { dispositionKind: 'pure_land_sale' },
            parsedResult: {},
            reviewResult: { approved: true, confidence: 0.9 },
            errorMessage: null,
            createdAt: '',
            updatedAt: '',
            completedAt: '',
          }],
        });
      }
      if (href === '/api/transcript-intake/runs/run-1' && options?.method === 'POST') {
        return Response.json({
          run: {
            id: 'run-1',
            status: 'confirmed',
            currentPhase: 'confirmed',
            routeDecision: localTextRouteDecision,
            detectionResult: { dispositionKind: 'pure_land_sale' },
            parsedResult: {},
            reviewResult: { approved: true, confidence: 0.9 },
            errorMessage: null,
            createdAt: '',
            updatedAt: '',
            completedAt: '',
          },
        });
      }
      return new Response(null, { status: 404 });
    });

    render(<TranscriptIntakeWorkbench property={property} documents={[transcriptDoc]} />);

    fireEvent.click(await screen.findByRole('button', { name: /儲存解析結果/ }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === '/api/transcript-intake/runs/run-1')).toBe(true);
    });
    const confirmCall = calls.find((call) => call.url === '/api/transcript-intake/runs/run-1');
    expect(confirmCall?.body).toMatchObject({
      areaDetailDraft: {
        version: 1,
        dispositionKind: 'pure_land_sale',
      },
    });
    expect(await screen.findByText('已確認並儲存謄本工作台結果')).toBeInTheDocument();
  });
});
