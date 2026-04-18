import { extractChatCompletionAssistantText } from '../extract-chat-completion-text';

describe('extractChatCompletionAssistantText', () => {
  it('returns message.content when present', () => {
    expect(
      extractChatCompletionAssistantText({
        choices: [{ message: { content: '  hello  ' } }],
      })
    ).toBe('hello');
  });

  it('returns message.reasoning when content is null (OpenRouter reasoning models)', () => {
    expect(
      extractChatCompletionAssistantText({
        choices: [
          {
            message: {
              content: null,
              reasoning: '我是由 Moonshot 開發的 Kimi 模型。',
            },
          },
        ],
      })
    ).toBe('我是由 Moonshot 開發的 Kimi 模型。');
  });

  it('prefers content over reasoning when both exist', () => {
    expect(
      extractChatCompletionAssistantText({
        choices: [{ message: { content: 'final', reasoning: 'think' } }],
      })
    ).toBe('final');
  });

  it('reads legacy choices[0].text', () => {
    expect(
      extractChatCompletionAssistantText({
        choices: [{ text: '  legacy  ' }],
      })
    ).toBe('legacy');
  });
});
