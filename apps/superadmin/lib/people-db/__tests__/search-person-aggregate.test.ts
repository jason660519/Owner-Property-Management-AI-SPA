// Row 145 Sprint 4b — aggregation unit tests (tdd-spec §4.4 support).

import {
  aggregateByPerson,
  type PersonCanonical,
  type PersonSourceLink,
  type SearchRecord,
} from '../search-person-aggregate';

function makeRecord(id: string, overrides: Partial<SearchRecord> = {}): SearchRecord {
  return {
    record_id: id,
    full_name: overrides.full_name ?? 'placeholder',
    id_number: overrides.id_number ?? null,
    phone: overrides.phone ?? null,
    mobile: overrides.mobile ?? null,
    email: overrides.email ?? null,
    address: overrides.address ?? null,
    company: overrides.company ?? null,
    data_source: overrides.data_source ?? null,
    dataset_path: overrides.dataset_path ?? null,
    quality_score: overrides.quality_score ?? null,
    import_batch_id: overrides.import_batch_id ?? null,
    source_file_path: overrides.source_file_path ?? null,
    source_document_id: overrides.source_document_id ?? null,
    created_at: overrides.created_at ?? null,
  };
}

function makePerson(person_id: string, overrides: Partial<PersonCanonical> = {}): PersonCanonical {
  return {
    person_id,
    canonical_name: overrides.canonical_name ?? '王小明',
    canonical_id_no: overrides.canonical_id_no ?? null,
    canonical_phones: overrides.canonical_phones ?? [],
    canonical_address: overrides.canonical_address ?? null,
    source_count: overrides.source_count ?? 1,
    quality_score: overrides.quality_score ?? null,
  };
}

describe('aggregateByPerson', () => {
  it('returns an empty list when no records are given', () => {
    const result = aggregateByPerson([], [], []);
    expect(result).toEqual([]);
  });

  it('emits an orphan entry for a record without a source link', () => {
    const rec = makeRecord('r1', { full_name: '無主記錄', address: '新北市' });
    const result = aggregateByPerson([rec], [], []);
    expect(result).toHaveLength(1);
    expect(result[0].person_id).toBeNull();
    expect(result[0].canonical_name).toBe('無主記錄');
    expect(result[0].sources).toHaveLength(1);
  });

  it('collapses two records belonging to the same person into one aggregate', () => {
    const records = [
      makeRecord('r1', { full_name: '王小明' }),
      makeRecord('r2', { full_name: '王小明' }),
    ];
    const links: PersonSourceLink[] = [
      { record_id: 'r1', person_id: 'p1' },
      { record_id: 'r2', person_id: 'p1' },
    ];
    const persons = [makePerson('p1', { canonical_name: '王小明', source_count: 2 })];

    const result = aggregateByPerson(records, links, persons);
    expect(result).toHaveLength(1);
    expect(result[0].person_id).toBe('p1');
    expect(result[0].canonical_name).toBe('王小明');
    expect(result[0].source_count).toBe(2);
    expect(result[0].sources.map((s) => s.record_id)).toEqual(['r1', 'r2']);
  });

  it('keeps distinct persons as separate aggregates, ordered by first appearance', () => {
    const records = [
      makeRecord('r2'), // person p2 appears first in ES ranking
      makeRecord('r1'), // person p1 appears second
      makeRecord('r3'),
    ];
    const links: PersonSourceLink[] = [
      { record_id: 'r1', person_id: 'p1' },
      { record_id: 'r2', person_id: 'p2' },
      { record_id: 'r3', person_id: 'p1' },
    ];
    const persons = [
      makePerson('p1', { canonical_name: '王小明', source_count: 2 }),
      makePerson('p2', { canonical_name: '李大華', source_count: 1 }),
    ];

    const result = aggregateByPerson(records, links, persons);
    expect(result.map((r) => r.person_id)).toEqual(['p2', 'p1']);
    expect(result[0].sources.map((s) => s.record_id)).toEqual(['r2']);
    expect(result[1].sources.map((s) => s.record_id)).toEqual(['r1', 'r3']);
  });

  it('puts orphan records after person aggregates and deduplicates repeated record_ids', () => {
    const records = [
      makeRecord('r1'),
      makeRecord('orphan-a', { full_name: '無主 A' }),
      makeRecord('r1'), // dedup — should not create a second source
      makeRecord('orphan-b', { full_name: '無主 B' }),
    ];
    const links: PersonSourceLink[] = [{ record_id: 'r1', person_id: 'p1' }];
    const persons = [makePerson('p1')];

    const result = aggregateByPerson(records, links, persons);
    expect(result.map((r) => r.person_id)).toEqual(['p1', null, null]);
    expect(result[0].sources).toHaveLength(1); // no duplicate
    expect(result[1].canonical_name).toBe('無主 A');
    expect(result[2].canonical_name).toBe('無主 B');
  });
});
