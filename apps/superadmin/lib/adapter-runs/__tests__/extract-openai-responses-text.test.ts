import { extractOpenAiResponsesOutputText } from '../extract-openai-responses-text';

describe('extractOpenAiResponsesOutputText', () => {
  it('prefers output[].content[].text over empty output_text', () => {
    const data = {
      output_text: '',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'Hello from nested output.' }],
        },
      ],
    };
    expect(extractOpenAiResponsesOutputText(data)).toBe('Hello from nested output.');
  });

  it('falls back to top-level output_text', () => {
    expect(
      extractOpenAiResponsesOutputText({
        output_text: 'Only here.',
        output: [],
      }),
    ).toBe('Only here.');
  });

  it('returns empty string when neither is present', () => {
    expect(extractOpenAiResponsesOutputText({ output: [{ type: 'message', content: [] }] })).toBe('');
  });
});
