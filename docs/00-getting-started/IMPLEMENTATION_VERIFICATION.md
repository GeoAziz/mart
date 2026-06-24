Implementation verification checklist

Run these steps after installing dependencies locally.

1) Install dependencies

```bash
npm install
```

2) Typecheck

```bash
npm run typecheck
```

3) Run dev server

```bash
npm run dev
```

4) Manual checks

- Sidebar
  - Collapse/expand: click toggle and verify it persists across reloads
  - When collapsed: icons show tooltips, active item has left accent border
  - Toggle button has min 44x44 hit area and `aria-label`
- Dashboard cards
  - Stat cards show skeletons while loading (simulate by throttling network)
  - Total Sales shows empty state when value is 0 with CTA
- Charts
  - X axis shows short month labels, Y axis formats large numbers (k)
  - Tooltip shows formatted currency and readable date
- Accessibility
  - Tab navigation shows visible focus outlines on menu and buttons
  - Command palette opens with Ctrl/Cmd+Shift+K and lists quick actions

5) Optional: run E2E tests if configured

```bash
./run_e2e_test.sh
```

Notes:
- I added `framer-motion` and `cmdk` to `package.json` and created a small shim file to avoid type errors before installing packages. Run `npm install` locally so the new dependencies are actually present.
- Some unrelated TypeScript errors exist in the repository (Firestore Timestamp handling, missing exports, etc.). Those pre-date these changes and may need separate fixes if `npm run typecheck` still reports errors.
