// Row 145 Sprint 4a Phase 2 — entity-resolution.ts unit tests.
// Covers the tdd-spec §4.1 case list: 8 decisions on how to route a
// normalized record (id-exact / fuzzy-match / blacklist / no-match).

import { decideAction, type DecideInput } from '../entity-resolution';
import type { NormalizedRecord } from '../normalize';

function n(partial: Partial<NormalizedRecord>): NormalizedRecord {
  return {
    name: partial.name ?? null,
    id_no: partial.id_no ?? null,
    phones: partial.phones ?? [],
    address: partial.address ?? null,
    birth_year: partial.birth_year ?? null,
  };
}

function baseInput(record: NormalizedRecord): DecideInput {
  return {
    record,
    recordBId: 'staging-1',
    idExactMatch: null,
    namePhoneMatches: [],
    nameAddrMatches: [],
    blacklistKeys: new Set<string>(),
  };
}

describe('decideAction', () => {
  it('1. id_no set + idExactMatch present → auto_merge', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', id_no: 'A123456789' })),
      idExactMatch: 'person-1',
    };
    expect(decideAction(input)).toEqual({
      action: 'auto_merge',
      person_id: 'person-1',
      reason: 'id_exact',
    });
  });

  it('2. id_no set + no idExactMatch → new_person (do NOT fall through to fuzzy)', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', id_no: 'A123456789', phones: ['0912345678'] })),
      idExactMatch: null,
      namePhoneMatches: ['person-2'], // would match fuzzy, but id_no is authoritative
    };
    expect(decideAction(input)).toEqual({ action: 'new_person' });
  });

  it('3. no id_no + name+phone match, not blacklisted → candidate name_phone @ 0.85', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', phones: ['0912345678'] })),
      namePhoneMatches: ['person-3'],
    };
    expect(decideAction(input)).toEqual({
      action: 'candidate',
      person_id: 'person-3',
      reason: 'name_phone',
      confidence: 0.85,
    });
  });

  it('4. name+phone match but pair is blacklisted → new_person (skip candidate)', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', phones: ['0912345678'] })),
      namePhoneMatches: ['person-3'],
      blacklistKeys: new Set(['person-3:staging-1']),
    };
    expect(decideAction(input)).toEqual({ action: 'new_person' });
  });

  it('5. no id_no + no name_phone + name+addr match → candidate name_addr @ 0.7', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿' })),
      nameAddrMatches: ['person-5'],
    };
    expect(decideAction(input)).toEqual({
      action: 'candidate',
      person_id: 'person-5',
      reason: 'name_addr',
      confidence: 0.7,
    });
  });

  it('6. no id_no + no matches anywhere → new_person', () => {
    const input = baseInput(n({ name: '不匹配的人' }));
    expect(decideAction(input)).toEqual({ action: 'new_person' });
  });

  it('7. both name+phone and name+addr match → prefer name_phone (higher signal)', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', phones: ['0912345678'] })),
      namePhoneMatches: ['person-phone'],
      nameAddrMatches: ['person-addr'],
    };
    expect(decideAction(input)).toEqual({
      action: 'candidate',
      person_id: 'person-phone',
      reason: 'name_phone',
      confidence: 0.85,
    });
  });

  it('8. multiple name_phone matches → pick the first (worker resolves ambiguity elsewhere)', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', phones: ['0912345678'] })),
      namePhoneMatches: ['person-a', 'person-b', 'person-c'],
    };
    const result = decideAction(input);
    expect(result).toEqual({
      action: 'candidate',
      person_id: 'person-a',
      reason: 'name_phone',
      confidence: 0.85,
    });
  });

  it('9. blacklist filters name_phone but name_addr is a different person → fallback to name_addr', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: '闕貴卿', phones: ['0912345678'] })),
      namePhoneMatches: ['person-phone'],
      nameAddrMatches: ['person-addr'],
      blacklistKeys: new Set(['person-phone:staging-1']),
    };
    expect(decideAction(input)).toEqual({
      action: 'candidate',
      person_id: 'person-addr',
      reason: 'name_addr',
      confidence: 0.7,
    });
  });

  it('10. record with no name at all → new_person (nothing to match on)', () => {
    const input: DecideInput = {
      ...baseInput(n({ name: null, phones: ['0912345678'] })),
      namePhoneMatches: ['person-x'], // hypothetical — caller must not populate this without a name anyway
    };
    // decideAction is defensive: if normalized.name is null, no fuzzy path fires.
    expect(decideAction(input)).toEqual({ action: 'new_person' });
  });
});
