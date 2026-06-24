# Findings

- `tsconfig.json` already maps `@/*` to `./src/*`, so `src/` is the canonical app code root.
- `src/data/accountNavItems.ts` is the active account navigation module.
- Root `data/accountNavItems.ts` is a duplicate of the `src/data` module and is not the import target.
- The repo still contains root-level generated artifacts and logs, which are visual noise but not required for runtime.
