# Lessons Learned

## Supabase CLI on Windows (2026-04-01)
- Global npm install of supabase CLI fails silently on PowerShell
- Local devDependency install works: `npm install --save-dev supabase`
- Must use `.cmd` shim: `& node_modules\.bin\supabase.cmd` (not `.ps1` — blocked by execution policy)
- `npx supabase` hangs on interactive prompt — avoid
- Access token must be `sbp_` prefixed (Personal Access Token from dashboard/account/tokens)
- Set via `$env:SUPABASE_ACCESS_TOKEN` — the `--token` flag does not exist

## Migration Files (2026-04-01)
- Circular FK (leads ↔ messages) resolved by: create leads without FK → create messages → ALTER TABLE to add FK
- Migration file corruption can occur — always verify file content before pushing
- `db push` is idempotent for already-applied migrations (skips them)
