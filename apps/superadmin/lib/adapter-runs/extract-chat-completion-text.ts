/**
 * 從 OpenAI-compatible chat/completions JSON 取出助理可讀文字。
 * OpenRouter 上部分模型（含推理／Kimi 系）可能僅填 `message.reasoning`，`content` 為 null。
 */
export function extractChatCompletionAssistantText(data: unknown): string {
  const root = data as {
    choices?: Array<{
      text?: string;
      message?: {
        content?: unknown;
        reasoning?: unknown;
        refusal?: unknown;
        reasoning_details?: unknown;
      };
    }>;
  };
  const ch0 = root.choices?.[0];
  if (!ch0) return '';

  if (typeof ch0.text === 'string') {
    const t = ch0.text.trim();
    if (t) return t;
  }

  const msg = ch0.message;
  if (!msg || typeof msg !== 'object') return '';

  const content = msg.content;
  if (typeof content === 'string') {
    const t = content.trim();
    if (t) return t;
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('')
      .trim();
    if (joined) return joined;
  }

  if (typeof msg.reasoning === 'string') {
    const t = msg.reasoning.trim();
    if (t) return t;
  }
  if (msg.reasoning && typeof msg.reasoning === 'object' && !Array.isArray(msg.reasoning)) {
    const r = msg.reasoning as Record<string, unknown>;
    if (typeof r.text === 'string' && r.text.trim()) return r.text.trim();
  }

  if (typeof msg.refusal === 'string') {
    const t = msg.refusal.trim();
    if (t) return t;
  }

  if (Array.isArray(msg.reasoning_details)) {
    const fromDetails = msg.reasoning_details
      .map((d) => {
        if (d && typeof d === 'object') {
          const o = d as Record<string, unknown>;
          if (typeof o.text === 'string') return o.text;
          if (typeof o.content === 'string') return o.content;
        }
        return '';
      })
      .join('')
      .trim();
    if (fromDetails) return fromDetails;
  }

  return '';
}
