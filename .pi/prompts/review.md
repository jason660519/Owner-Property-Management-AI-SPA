Review the current changes (staged + unstaged) for code quality.

## Focus Areas
- TypeScript strict compliance (no `any`, proper types)
- Correct Supabase client imports per app (see AGENTS.md)
- CSS tokens instead of raw Tailwind colors
- Server vs Client Component correctness
- Security: no leaked secrets, proper RLS usage
- File size under 500 lines

## Output
- List issues by severity: Critical / Warning / Suggestion
- For each issue: file, line, description, fix recommendation
