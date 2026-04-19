/**
 * @jest-environment node
 */
import { Pool } from 'pg';

import { copyStagingRowsForFile, getConnectionString } from '../staging-copy';
import type { StagingRow } from '../staging';

const conn = process.env.PEOPLE_DB_TEST_PG_URL ?? getConnectionString();

describe('staging-copy', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: conn, max: 2 });
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('COPYs 1000 rows and matches count', async () => {
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.people_db_files (sha256, source_path, dataset_root, ext, size_bytes, mtime, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')
       RETURNING id`,
      ['test-sha-copy-1000', '/tmp/x', 'root', '.dbf', 1],
    );
    const fileId = ins.rows[0].id;
    try {
      const rows: StagingRow[] = Array.from({ length: 1000 }, (_, i) => ({
        file_id: fileId,
        record_index: i,
        raw: { n: String(i) },
      }));
      await copyStagingRowsForFile(pool, fileId, rows);
      const { rows: c } = await pool.query<{ c: string }>(
        'SELECT count(*)::text AS c FROM public.people_db_staging_records WHERE file_id = $1',
        [fileId],
      );
      expect(Number(c[0].c)).toBe(1000);
    } finally {
      await pool.query('DELETE FROM public.people_db_staging_records WHERE file_id = $1', [fileId]);
      await pool.query('DELETE FROM public.people_db_files WHERE id = $1', [fileId]);
    }
  });

  it('round-trips JSONB with CJK in raw', async () => {
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.people_db_files (sha256, source_path, dataset_root, ext, size_bytes, mtime, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')
       RETURNING id`,
      ['test-sha-cjk', '/tmp/y', 'root', '.dbf', 1],
    );
    const fileId = ins.rows[0].id;
    try {
      const rows: StagingRow[] = [
        {
          file_id: fileId,
          record_index: 0,
          raw: { name: '測試', q: 'a"b,c\n' },
        },
      ];
      await copyStagingRowsForFile(pool, fileId, rows);
      const { rows: out } = await pool.query<{ raw: { name: string } }>(
        'SELECT raw FROM public.people_db_staging_records WHERE file_id = $1 AND record_index = 0',
        [fileId],
      );
      expect(out[0].raw.name).toBe('測試');
    } finally {
      await pool.query('DELETE FROM public.people_db_staging_records WHERE file_id = $1', [fileId]);
      await pool.query('DELETE FROM public.people_db_files WHERE id = $1', [fileId]);
    }
  });

  it('strips NUL bytes (\\u0000) that JSONB would reject (22P05)', async () => {
    // DBF fixed-width fields often pad with 0x00; Postgres JSONB cannot store
    // \u0000 and COPY aborts the whole transaction if any row contains one.
    // staging-copy must scrub the NUL escape before handing it to COPY.
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO public.people_db_files (sha256, source_path, dataset_root, ext, size_bytes, mtime, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'pending')
       RETURNING id`,
      ['test-sha-nul', '/tmp/z', 'root', '.dbf', 1],
    );
    const fileId = ins.rows[0].id;
    try {
      const rows: StagingRow[] = [
        {
          file_id: fileId,
          record_index: 0,
          raw: { addr: '台北市民生東路\u0000\u0000\u0000  ', name: '王\u0000五' },
        },
      ];
      await copyStagingRowsForFile(pool, fileId, rows);
      const { rows: out } = await pool.query<{ raw: { addr: string; name: string } }>(
        'SELECT raw FROM public.people_db_staging_records WHERE file_id = $1 AND record_index = 0',
        [fileId],
      );
      expect(out[0].raw.addr).toBe('台北市民生東路  ');
      expect(out[0].raw.name).toBe('王五');
    } finally {
      await pool.query('DELETE FROM public.people_db_staging_records WHERE file_id = $1', [fileId]);
      await pool.query('DELETE FROM public.people_db_files WHERE id = $1', [fileId]);
    }
  });

  it('throws when the pool cannot connect (no connection leak)', async () => {
    const badPool = new Pool({ connectionString: 'postgresql://invalid:invalid@127.0.0.1:59999/nope', max: 1 });
    await expect(
      copyStagingRowsForFile(badPool, '00000000-0000-0000-0000-000000000001', [
        {
          file_id: '00000000-0000-0000-0000-000000000001',
          record_index: 0,
          raw: { a: 1 },
        },
      ]),
    ).rejects.toThrow();
    await badPool.end();
  });
});
