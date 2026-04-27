import {
  TRANSCRIPT_PARSE_PROMPT,
  withTranscriptParseKindDirective,
} from '@/lib/transcript-prompts';

describe('transcript prompts', () => {
  it('front-loads visual transcription before schema mapping for title copies', () => {
    expect(TRANSCRIPT_PARSE_PROMPT).toContain('先做「視覺文字轉錄」');
    expect(TRANSCRIPT_PARSE_PROMPT).toContain('權狀影本優先規則');
    expect(TRANSCRIPT_PARSE_PROMPT).toContain('不要輸出你的轉錄過程');
  });

  it('does not force title copies to clear the opposite transcript section', () => {
    const landTitle = withTranscriptParseKindDirective('land_title', 'BASE').prompt;
    const buildingTitle = withTranscriptParseKindDirective('building_title', 'BASE').prompt;

    expect(landTitle).toContain('若同頁可見「建物標示」');
    expect(landTitle).not.toContain('buildingTranscript 必須為完整空結構');
    expect(buildingTitle).toContain('若同頁可見「土地標示」');
    expect(buildingTitle).not.toContain('landTranscript 必須為完整空結構');
  });
});
