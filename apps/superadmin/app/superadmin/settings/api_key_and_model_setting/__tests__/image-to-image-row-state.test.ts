import {
  createCustomImageToImageRow,
  fromStoredRows,
  rowToStored,
} from '../image-to-image-row-state';

describe('image-to-image row storage', () => {
  it('creates the default Gemini row when there is no saved row state', () => {
    const rows = fromStoredRows([]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('baseline-gemini-banana');
    expect(rows[0].isBaseline).toBe(true);
  });

  it('does not restore the default Gemini row after the user deleted it', () => {
    const customRow = createCustomImageToImageRow(1, {
      providerId: 'openai',
      modelId: 'gpt-image-1',
    });

    const rows = fromStoredRows([rowToStored(customRow)]);

    expect(rows).toHaveLength(1);
    expect(rows[0].providerId).toBe('openai');
    expect(rows[0].isBaseline).toBe(false);
  });
});
