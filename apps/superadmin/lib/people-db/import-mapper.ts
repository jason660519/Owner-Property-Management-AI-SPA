// Maps parsed CSV rows into Elasticsearch documents using the user-supplied
// column_mapping (field_key -> column_index). Also emits quality scores and
// normalized address so search behaviour matches existing docs.

import { normalizeAddress } from './address-normalize';

export interface ImportMapperInput {
  columns: string[];
  rows: Record<string, string>[];
  columnMapping: Record<string, number>;
  datasetPath: string;
  datasetRoot?: string | null;
  datasetSubpath?: string | null;
  dataSource?: string | null;
  batchId: string;
  batchLabel?: string | null;
  now?: string;
}

export interface PeopleDocument {
  record_id: string;
  batch_id: string;
  dataset_path: string;
  dataset_root: string | null;
  dataset_subpath: string | null;
  data_source: string | null;
  batch_label: string | null;
  name: string | null;
  id_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  birth_date: string | null;
  address: string | null;
  address_normalized: string | null;
  address_county: string | null;
  address_district: string | null;
  address_road: string | null;
  company: string | null;
  note: string | null;
  quality_score: number;
  created_at: string;
}

const FIELD_KEYS = [
  'full_name',
  'id_number',
  'phone',
  'mobile',
  'email',
  'birth_date',
  'address',
  'company',
  'note',
] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

export function mapRowsToDocuments(input: ImportMapperInput): PeopleDocument[] {
  const now = input.now ?? new Date().toISOString();
  const docs: PeopleDocument[] = [];

  for (let i = 0; i < input.rows.length; i += 1) {
    const row = input.rows[i];
    const values: Partial<Record<FieldKey, string>> = {};
    for (const key of FIELD_KEYS) {
      const colIdx = input.columnMapping[key];
      if (colIdx === undefined || colIdx < 0) continue;
      const columnName = input.columns[colIdx];
      if (!columnName) continue;
      const raw = (row[columnName] ?? '').trim();
      if (raw) values[key] = raw;
    }

    if (!values.full_name) continue; // skip unidentified rows

    const address = values.address ?? null;
    const addr = address ? normalizeAddress(address) : null;

    const doc: PeopleDocument = {
      record_id: `${input.batchId}:${i}`,
      batch_id: input.batchId,
      dataset_path: input.datasetPath,
      dataset_root: input.datasetRoot ?? null,
      dataset_subpath: input.datasetSubpath ?? null,
      data_source: input.dataSource ?? null,
      batch_label: input.batchLabel ?? null,
      name: values.full_name,
      id_number: values.id_number ? values.id_number.toUpperCase() : null,
      phone: values.phone ? values.phone.replace(/[^\d+]/g, '') : null,
      mobile: values.mobile ? values.mobile.replace(/[^\d+]/g, '') : null,
      email: values.email ? values.email.toLowerCase() : null,
      birth_date: values.birth_date ?? null,
      address,
      address_normalized: addr?.normalized ?? null,
      address_county: addr?.county ?? null,
      address_district: addr?.district ?? null,
      address_road: addr?.road ?? null,
      company: values.company ?? null,
      note: values.note ?? null,
      quality_score: computeQuality(values),
      created_at: now,
    };
    docs.push(doc);
  }
  return docs;
}

// Quality score in [0,1]: rewards more filled identifying fields.
export function computeQuality(values: Partial<Record<FieldKey, string>>): number {
  const weights: Record<FieldKey, number> = {
    full_name: 0.25,
    id_number: 0.25,
    phone: 0.1,
    mobile: 0.1,
    email: 0.05,
    birth_date: 0.05,
    address: 0.1,
    company: 0.05,
    note: 0.05,
  };
  let score = 0;
  for (const key of FIELD_KEYS) {
    if (values[key]) score += weights[key];
  }
  return Math.min(1, Number(score.toFixed(4)));
}
