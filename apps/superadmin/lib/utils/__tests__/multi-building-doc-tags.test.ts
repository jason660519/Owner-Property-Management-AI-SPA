import { filterDocumentsForMultiBuildingSlot } from '../multi-building-doc-tags';
import type { PropertyDocumentItem } from '@/lib/types/properties';

function doc(
  id: string,
  tags: string[] | null,
): PropertyDocumentItem {
  return {
    id,
    documentType: 'building_registry_transcript',
    documentName: 'x',
    filePath: 'p',
    url: '/u',
    tags,
  };
}

describe('filterDocumentsForMultiBuildingSlot', () => {
  it('when no mbi tags, all docs belong to slot 1 only', () => {
    const list = [doc('a', null), doc('b', ['other'])];
    expect(filterDocumentsForMultiBuildingSlot(list, 1)).toHaveLength(2);
    expect(filterDocumentsForMultiBuildingSlot(list, 2)).toHaveLength(0);
  });

  it('when any mbi tag exists, filters by mbi slot', () => {
    const list = [doc('a', ['mbi:1']), doc('b', ['mbi:2']), doc('c', null)];
    expect(filterDocumentsForMultiBuildingSlot(list, 1).map((d) => d.id)).toEqual(['a']);
    expect(filterDocumentsForMultiBuildingSlot(list, 2).map((d) => d.id)).toEqual(['b']);
  });
});
