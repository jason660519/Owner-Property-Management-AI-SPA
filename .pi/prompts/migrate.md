Create a new Supabase migration.

## Usage
`/migrate <description>`

## Steps
1. Generate timestamp: `YYYYMMDDHHMMSS`
2. Create file: `supabase/migrations/{timestamp}_{description}.sql`
3. If the user described the schema change, write the SQL
4. Remind: run `supabase db reset` to apply locally, then `supabase gen types typescript --local > packages/types/database.ts` to regenerate types
