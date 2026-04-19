declare module 'pg-copy-streams' {
  import type { Submittable } from 'pg';

  /** Pass to `client.query(...)` then pipe readable CSV into the returned stream. */
  export function from(sql: string): Submittable;
}
