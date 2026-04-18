// Row 145 Sprint 4a Phase 1 — raw → normalized record transformer.
//
// Turns whatever the parsers produced (CJK / mixed-width / ROC dates)
// into the canonical shape the ER worker compares on:
//
//   { name, id_no, phones: string[], address: NormalizedAddress, birth_year: CE }
//
// Reuses Row 144 `normalizeAddress` and Row 132 `normalizePhone` so this
// module only adds name / id_no / birth_year helpers.

import { normalizeAddress, type NormalizedAddress } from './address-normalize';
import { normalizePhone } from './search-strategy';

export interface NormalizedRecord {
  name: string | null;
  id_no: string | null;
  phones: string[];
  address: NormalizedAddress | null;
  birth_year: number | null; // CE
}

export interface ColumnMap {
  name?: string[];
  id_no?: string[];
  phone?: string[];
  address?: string[];
  birth?: string[];
}

// Taiwan id: 1 letter + 9 digits. No checksum here — rejecting on a bad
// checksum filters too aggressively on OCR/legacy data.
const TW_ID_REGEX = /^[A-Z]\d{9}$/;
const ROC_DATE_REGEX = /(?:民國)?(\d{1,3})[年/\-]/;

function toHalfWidth(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code === 0x3000) {
      out += ' ';
    } else if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else {
      out += text[i];
    }
  }
  return out;
}

export function normalizeName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const collapsed = toHalfWidth(raw).replace(/\s+/g, '').trim();
  return collapsed === '' ? null : collapsed;
}

export function normalizeIdNo(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.replace(/\s+/g, '').toUpperCase();
  if (!TW_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

export function normalizeBirthYear(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ROC date with a year-month separator: "民國55年...", "102/05/20", "102-05-20"
  const rocMatch = s.match(ROC_DATE_REGEX);
  if (rocMatch) {
    const roc = Number(rocMatch[1]);
    if (roc >= 1 && roc <= 200) return roc + 1911;
  }

  // Bare 3-digit integer → ROC year
  if (/^\d{3}$/.test(s)) {
    const roc = Number(s);
    if (roc >= 1 && roc <= 200) return roc + 1911;
  }

  // Bare 4-digit integer in sane range → CE year
  if (/^\d{4}$/.test(s)) {
    const ce = Number(s);
    if (ce >= 1900 && ce <= 2100) return ce;
  }

  return null;
}

function pickField(
  raw: Record<string, string>,
  candidates: string[] | undefined,
): string | null {
  if (!candidates) return null;
  for (const c of candidates) {
    const value = raw[c];
    if (value != null && value !== '') return value;
  }
  return null;
}

function pickAllFields(
  raw: Record<string, string>,
  candidates: string[] | undefined,
): string[] {
  if (!candidates) return [];
  const out: string[] = [];
  for (const c of candidates) {
    const value = raw[c];
    if (value != null && value !== '') out.push(value);
  }
  return out;
}

export function normalizeRecord(
  raw: Record<string, string>,
  map: ColumnMap,
): NormalizedRecord {
  const name = normalizeName(pickField(raw, map.name));
  const id_no = normalizeIdNo(pickField(raw, map.id_no));

  const phones: string[] = [];
  const seen = new Set<string>();
  for (const rawPhone of pickAllFields(raw, map.phone)) {
    const n = normalizePhone(rawPhone);
    if (n && !seen.has(n)) {
      seen.add(n);
      phones.push(n);
    }
  }

  const addressRaw = pickField(raw, map.address);
  const address = addressRaw ? normalizeAddress(addressRaw) : null;

  const birth_year = normalizeBirthYear(pickField(raw, map.birth));

  return { name, id_no, phones, address, birth_year };
}

/**
 * Default Taiwan column map. Covers the column names observed across
 * Row 131/132/144 datasets (CSV headers, mdb/dbf exports, PDF tabular).
 * Callers may override per-dataset if a source uses a non-standard header.
 */
export const DEFAULT_COLUMN_MAP: ColumnMap = {
  name: ['姓名', 'name', '客戶姓名', '會員姓名'],
  id_no: ['身分證', '身分證字號', 'id_no', 'IDNO', 'ID'],
  phone: ['電話', '行動電話', '手機', '聯絡電話', 'phone', 'mobile', '市話'],
  address: ['地址', '戶籍地址', '通訊地址', 'address', '居住地址'],
  birth: ['出生', '出生日期', '生日', 'birth', 'birthday', 'birth_date'],
};
