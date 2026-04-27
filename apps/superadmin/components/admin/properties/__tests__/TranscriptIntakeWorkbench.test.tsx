import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TranscriptIntakeWorkbench } from '../TranscriptIntakeWorkbench';
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
          routeDecision: { aggregateRoute: 'vlm_visual' },
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
            routeDecision: { aggregateRoute: 'vlm_visual' },
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
          routeDecision: { aggregateRoute: 'vlm_visual' },
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
    expect(await screen.findByText(/先在下方上傳建物/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /建立並判讀/ })).toBeDisabled();
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
            routeDecision: { aggregateRoute: 'vlm_visual' },
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
            routeDecision: { aggregateRoute: 'vlm_visual' },
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

    fireEvent.click(await screen.findByRole('button', { name: /確認並儲存/ }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === '/api/transcript-intake/runs/run-1')).toBe(true);
    });
    expect(await screen.findByText('已確認並儲存謄本工作台結果')).toBeInTheDocument();
  });
});
