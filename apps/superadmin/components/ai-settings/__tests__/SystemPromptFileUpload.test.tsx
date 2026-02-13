import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemPromptFileUpload } from '../SystemPromptFileUpload';

// Mock pdfjs-dist
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: '1.0.0',
  getDocument: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock EventSource
class MockEventSource {
  onmessage: (event: any) => void = () => {};
  onerror: (event: any) => void = () => {};
  close = jest.fn();
  constructor(url: string) {}
}
global.EventSource = MockEventSource as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

describe('SystemPromptFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles upload failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Backend error' }),
    });

    render(<SystemPromptFileUpload />);
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    
    if (input) {
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);
    }
    
    await waitFor(() => screen.getByText('test.png'));
    
    const uploadBtn = screen.getByText('開始上傳與解析');
    fireEvent.click(uploadBtn);
    
    await waitFor(() => {
        expect(screen.getByText(/Backend error/)).toBeInTheDocument();
    });
  });

  it('renders upload area', () => {
    render(<SystemPromptFileUpload />);
    expect(screen.getByText(/拖放檔案至此/)).toBeInTheDocument();
    expect(screen.getByText(/支援 PDF, JPG/)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<SystemPromptFileUpload />);
    
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    // react-dropzone hides the input but we can select it
    // The component sets aria-label on the div, but the input is inside
    const input = document.querySelector('input[type="file"]');
    
    if (input) {
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);
    }

    await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  it('shows error for large files', async () => {
    render(<SystemPromptFileUpload />);
    
    const file = new File(['a'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    
    if (input) {
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);
    }

    await waitFor(() => {
        expect(screen.getByText(/檔案超過 10MB/)).toBeInTheDocument();
    });
  });
});
