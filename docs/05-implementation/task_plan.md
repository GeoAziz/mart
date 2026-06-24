# Task: Repo organization cleanup

## Phases
- [x] Phase 1: Identify noisy duplicates and safe consolidation targets
- [x] Phase 2: Remove or relocate redundant root-level files
- [x] Phase 3: Normalize repo hygiene for generated artifacts
- [ ] Phase 4: Validate the touched slice

## Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Keep `src/` as the canonical app code root | `tsconfig.json` already maps `@/*` to `./src/*` | 2026-06-01 |
| Remove root `data/accountNavItems.ts` duplicate | `src/data/accountNavItems.ts` is the active import target | 2026-06-01 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `vscode_listCodeUsages` called with the wrong identifier shape | 1 | Retried with the correct symbol metadata |
| `npm run typecheck` failed in `src/hooks/useVendorNotifications.ts` | 1 | Left as an unrelated pre-existing parse error outside the cleanup slice |
