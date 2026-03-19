import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyDescriptionAIAssistant } from '../PropertyDescriptionAIAssistant';

const clipboardWriteTextMock = jest.fn();

function createSSEBody(events: unknown[]) {
  const encoder = new TextEncoder();
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');

  return {
    getReader() {
      let sent = false;

      return {
        async read() {
          if (sent) {
            return { done: true, value: undefined };
          }

          sent = true;
          return { done: false, value: encoder.encode(payload) };
        },
      };
    },
  };
}

function mockStreamResponse(events: unknown[], status = 200) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: createSSEBody(events),
  });
}

function TestHarness() {
  const [description, setDescription] = React.useState('既有文案');

  return (
    <PropertyDescriptionAIAssistant
      listingType="sale"
      title="大安區採光三房"
      propertyType="大樓"
      area={35}
      bedrooms={3}
      bathrooms={2}
      livingRooms={2}
      parkingSpaces={1}
      price={2680}
      monthlyRent={0}
      addressCity="台北市"
      addressDistrict="大安區"
      addressStreet="仁愛路四段"
      addressNumber="100號"
      addressFloor="12樓"
      addressUnit=""
      description={description}
      onDescriptionChange={setDescription}
    />
  );
}

describe('PropertyDescriptionAIAssistant', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    clipboardWriteTextMock.mockReset();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
    URL.createObjectURL = jest.fn().mockReturnValue('blob:trace-report');
    URL.revokeObjectURL = jest.fn();
  });

  it('shows a helpful API key message when Anthropic returns 401', async () => {
    const user = userEvent.setup();
    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'ai_settings' },
      { type: 'error', message: 'Anthropic API 金鑰無效或已過期，請至「AI 服務 / API KEY」更新後再試' },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Anthropic API 金鑰無效或已過期，請至「AI 服務 / API KEY」更新後再試').length
      ).toBeGreaterThan(0);
    });
  });

  it('keeps the current textarea unchanged after generating a draft', async () => {
    const user = userEvent.setup();
    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'resources', resources: [{ label: '標題', value: '大安區採光三房' }] },
      { type: 'phase', phase: 'loading_prompt', message: '載入 Prompt 模板中…' },
      { type: 'prompt_loaded', promptName: '物件描述文案', promptSource: 'ai_system_prompt', moduleKey: 'blog_generator', templatePreview: 'template', finalPromptPreview: 'final prompt' },
      { type: 'phase', phase: 'selecting_model', message: '選擇 LLM 與金鑰來源中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'ai_settings', moduleKey: 'blog_generator', selectionSource: 'ai_module' },
      { type: 'phase', phase: 'sending_request', message: '正在送出 AI 請求…' },
      { type: 'phase', phase: 'waiting_response', message: '等待 LLM 回應中…' },
      { type: 'response_meta', status: 200, durationMs: 1200 },
      { type: 'phase', phase: 'completed', message: 'AI 草稿已完成' },
      { type: 'complete', description: 'AI 草稿內容', durationMs: 1200, usage: { inputTokens: 123, outputTokens: 45 } },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));

    await waitFor(() => {
      expect(screen.getByText('AI 草稿預覽')).toBeInTheDocument();
    });

    expect(screen.getByText('Provider: anthropic')).toBeInTheDocument();
    expect(screen.getByText('Model: claude-sonnet-4-6')).toBeInTheDocument();
    expect(screen.getByText('名稱: 物件描述文案')).toBeInTheDocument();
    expect(screen.getAllByText('Module Key: blog_generator').length).toBeGreaterThan(0);
    expect(screen.getByText('模型來源: AI Module Assignment')).toBeInTheDocument();
    expect(screen.getByText('來源: ai_system_prompts')).toBeInTheDocument();

    expect(screen.getByLabelText('最終物件介紹')).toHaveValue('既有文案');
  });

  it('only updates the textarea after the user applies the draft', async () => {
    const user = userEvent.setup();
    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'phase', phase: 'loading_prompt', message: '載入 Prompt 模板中…' },
      { type: 'phase', phase: 'selecting_model', message: '選擇 LLM 與金鑰來源中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'ai_settings' },
      { type: 'phase', phase: 'completed', message: 'AI 草稿已完成' },
      { type: 'complete', description: 'AI 草稿內容', durationMs: 900 },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));
    await waitFor(() => {
      expect(screen.getByText('AI 草稿預覽')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '套用草稿' }));

    expect(screen.getByLabelText('最終物件介紹')).toHaveValue('AI 草稿內容');
  });

  it('can append the draft and then restore the previous content', async () => {
    const user = userEvent.setup();
    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'phase', phase: 'loading_prompt', message: '載入 Prompt 模板中…' },
      { type: 'phase', phase: 'selecting_model', message: '選擇 LLM 與金鑰來源中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'ai_settings' },
      { type: 'phase', phase: 'completed', message: 'AI 草稿已完成' },
      { type: 'complete', description: 'AI 草稿內容', durationMs: 900 },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));
    await waitFor(() => {
      expect(screen.getByText('AI 草稿預覽')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '附加到文案' }));
    expect(screen.getByLabelText('最終物件介紹')).toHaveValue('既有文案\n\nAI 草稿內容');

    await user.click(screen.getByRole('button', { name: '還原上次套用' }));
    expect(screen.getByLabelText('最終物件介紹')).toHaveValue('既有文案');
  });

  it('can copy the current trace report to clipboard', async () => {
    const user = userEvent.setup();
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'resources', resources: [{ label: '標題', value: '大安區採光三房' }] },
      { type: 'phase', phase: 'loading_prompt', message: '載入 Prompt 模板中…' },
      { type: 'prompt_loaded', promptName: '物件描述文案', promptSource: 'saved_prompt', templatePreview: 'template', finalPromptPreview: 'final prompt' },
      { type: 'phase', phase: 'selecting_model', message: '選擇 LLM 與金鑰來源中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'ai_settings' },
      { type: 'phase', phase: 'completed', message: 'AI 草稿已完成' },
      { type: 'complete', description: 'AI 草稿內容', durationMs: 1100 },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '複製 trace' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '複製 trace' }));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('物件介紹 AI 生成 Trace'));
    });
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('Provider: anthropic'));
    expect(screen.getByText('已複製 trace')).toBeInTheDocument();

    writeTextSpy.mockRestore();
  });

  it('can download the current trace report as a text file', async () => {
    const user = userEvent.setup();
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    mockStreamResponse([
      { type: 'phase', phase: 'collecting_context', message: '蒐集物件資料中…' },
      { type: 'phase', phase: 'loading_prompt', message: '載入 Prompt 模板中…' },
      { type: 'prompt_loaded', promptName: '物件描述文案', promptSource: 'default', templatePreview: 'template', finalPromptPreview: 'final prompt' },
      { type: 'phase', phase: 'selecting_model', message: '選擇 LLM 與金鑰來源中…' },
      { type: 'model_selected', provider: 'anthropic', model: 'claude-sonnet-4-6', apiKeySource: 'env' },
      { type: 'phase', phase: 'completed', message: 'AI 草稿已完成' },
      { type: 'complete', description: 'AI 草稿內容', durationMs: 900 },
    ]);

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: '產生 AI 草稿' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '下載 trace' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '下載 trace' }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:trace-report');
    expect(screen.getByText('已下載 trace')).toBeInTheDocument();

    clickSpy.mockRestore();
  });
});