import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractPreviewToggle } from '../ContractPreviewToggle';
import type { ContractDraft } from '@/lib/types/contracts';

// Mock the dynamic import of ContractRichTextEditor
jest.mock('next/dynamic', () => {
  return function mockDynamic(loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) {
    // Immediately resolve the dynamic import
    let Component: React.ComponentType<Record<string, unknown>> | null = null;
    const promise = loader();
    promise.then((mod) => { Component = mod.default; });

    return function DynamicComponent(props: Record<string, unknown>) {
      if (!Component) return <div data-testid="editor-loading">載入編輯器…</div>;
      return <Component {...props} />;
    };
  };
});

// Mock the TipTap editor component
jest.mock('../ContractRichTextEditor', () => ({
  ContractRichTextEditor: ({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="editor-content"
        defaultValue={initialHtml}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

const MOCK_LEASE_DRAFT: ContractDraft = {
  contractType: 'lease',
  draftStatus: 'draft',
  templateCode: 'tw-lease-template',
  templateVersion: '1.0.0',
  contractDate: '2026-04-08',
  propertyId: 'prop-1',
  propertyAddress: '臺北市大安區仁愛路四段295號3樓',
  ownerName: '王大明',
  tenantName: '林小美',
  monthlyRent: 32000,
  depositAmount: 64000,
  contractCopiesCount: 2,
  holdoverPenaltyMultiple: 2,
  paymentDueDay: 5,
  usePurpose: 'residential',
  includedItems: ['冷氣'],
  specialTerms: '',
  buildingTranscriptAttached: false,
  landTranscriptAttached: false,
  transcriptAttachmentNote: '',
  attachments: [],
} as unknown as ContractDraft;

const MOCK_PREVIEW_HTML = '<html><body><h1>租賃契約</h1><p>測試內容</p></body></html>';

describe('ContractPreviewToggle', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('renders iframe in preview mode by default', () => {
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getByTitle('契約草稿預覽')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編輯模式' })).toBeInTheDocument();
    expect(screen.queryByTestId('rich-text-editor')).not.toBeInTheDocument();
  });

  it('switches to editor when edit mode button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '編輯模式' }));

    // In edit mode, should show preview mode button
    expect(screen.getByRole('button', { name: '預覽模式' })).toBeInTheDocument();
    // iframe should not be visible
    expect(screen.queryByTitle('契約草稿預覽')).not.toBeInTheDocument();
  });

  it('switches back to preview when preview mode button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '編輯模式' }));
    await user.click(screen.getByRole('button', { name: '預覽模式' }));

    expect(screen.getByTitle('契約草稿預覽')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編輯模式' })).toBeInTheDocument();
  });

  it('shows "已編輯" badge when editedHtml is present', () => {
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml="<p>modified content</p>"
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getByText('已編輯')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '還原原始內容' })).toBeInTheDocument();
  });

  it('does not show "已編輯" badge when editedHtml is null', () => {
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.queryByText('已編輯')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '還原原始內容' })).not.toBeInTheDocument();
  });

  it('calls onEditedHtmlChange(null) and exits edit mode when reset is clicked', async () => {
    const user = userEvent.setup();
    const onEditedHtmlChange = jest.fn();
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml="<p>modified</p>"
        onEditedHtmlChange={onEditedHtmlChange}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '還原原始內容' }));

    expect(onEditedHtmlChange).toHaveBeenCalledWith(null);
    // Should return to preview mode
    expect(screen.getByTitle('契約草稿預覽')).toBeInTheDocument();
  });

  it('renders all export buttons', () => {
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '下載 HTML' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下載 DOCX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列印 / PDF' })).toBeInTheDocument();
  });

  it('downloads HTML with original content when no edits', async () => {
    const user = userEvent.setup();
    const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '下載 HTML' }));
    expect(anchorClick).toHaveBeenCalled();

    anchorClick.mockRestore();
  });

  it('shows edit mode description when editing', async () => {
    const user = userEvent.setup();
    render(
      <ContractPreviewToggle
        draft={MOCK_LEASE_DRAFT}
        previewHtml={MOCK_PREVIEW_HTML}
        editedHtml={null}
        onEditedHtmlChange={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '編輯模式' }));

    expect(screen.getByText(/編輯模式：可直接修改合約條文內容/)).toBeInTheDocument();
  });
});
