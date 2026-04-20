import {
  isAdapterRunMetaContent,
  isAdapterRunMetaLine,
  stripAdapterLogTimestamp,
} from '@/lib/adapter-runs/adapter-run-meta-lines';

describe('adapter-run-meta-lines', () => {
  it('strips leading timestamp', () => {
    expect(stripAdapterLogTimestamp('[07:42:40] 選定模型：x')).toBe('選定模型：x');
  });

  it('marks injected adapter bookkeeping as meta', () => {
    expect(isAdapterRunMetaContent('選定模型：openrouter/qwen/qwen3.6-plus')).toBe(true);
    expect(isAdapterRunMetaContent('Fallback 模型解析：openrouter/qwen/qwen3.6-plus（requested）')).toBe(true);
    expect(isAdapterRunMetaContent('API Key 來源：ANTHROPIC_API_KEY:supabase')).toBe(true);
  });

  it('does not mark real assistant text as meta', () => {
    expect(isAdapterRunMetaContent('我是通義千問 Qwen，由阿里巴巴訓練。')).toBe(false);
  });

  it('classifies full log lines with timestamps', () => {
    expect(isAdapterRunMetaLine('[07:42:40] Fallback 模型解析：x（requested）')).toBe(true);
    expect(isAdapterRunMetaLine('[07:42:40] 你好，我是 Qwen。')).toBe(false);
  });
});
