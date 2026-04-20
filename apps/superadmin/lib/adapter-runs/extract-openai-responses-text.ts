/**
 * OpenAI `POST /v1/responses` JSON: assistant text often lives in
 * `output[].content[].text`; `output_text` is not always populated.
 *
 * Mirrors the extraction used in `model-research/generate/route.ts` so
 * adapter HTTP tests do not show "成功但無輸出" when the API returned text.
 */
export function extractOpenAiResponsesOutputText(data: unknown): string {
  const root = data as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
    output_text?: string;
  };
  let text = '';
  for (const item of root.output ?? []) {
    if (!Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if (typeof block?.text === 'string') text += block.text;
    }
  }
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  if (typeof root.output_text === 'string' && root.output_text.trim()) {
    return root.output_text.trim();
  }
  return '';
}
