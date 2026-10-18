<!--
  ╔════════════════════════════════════════════════════════════════════╗
  ║  PHASE 2 STATUS — updated after frontend remediation                  ║
  ║                                                                       ║
  ║  Branch:  feature/frontend-remediation-supabase-prep                    ║
  ║  Lint:    30 errors → 0 errors                                         ║
  ║  Tests:   0 → 18 (vitest + RTL, all passing)                          ║
  ║  Build:   succeeds (1.25s)                                             ║
  ║  Audit:   19 vulns → 7 (all dev-only, in Tailwind 3.x transitive deps) ║
  ║                                                                       ║
  ║  Highlights:                                                           ║
  ║    - P1-001 fixed: session persists across refresh (demo + Supabase)   ║
  ║    - P1-002 fixed: NewSaleModal Rules-of-Hooks crash resolved         ║
  ║    - P1-003 fixed: dashboard CTAs use React Router, no more reload    ║
  ║    - P1-004 fixed: 30 lint errors cleaned up                           ║
  ║    - P2-001 fixed: ErrorBoundary wraps every lazy page                ║
  ║    - P2-002 fixed: /settings, /documents, /forgot-password now exist ║
  ║    - P2-005/6/7 fixed: icon-rendering bugs (cat.Icon, item.emoji)     ║
  ║    - P2-009 fixed: CustomerModal phone regex tightened                ║
  ║    - P2-013 partial: dashboard Export now writes a real CSV           ║
  ║                                                                       ║
  ║  New files added in Phase 2:                                          ║
  ║    - src/lib/env.js                            (typed env access)      ║
  ║    - src/lib/supabase.js                        (safe Supabase client) ║
  ║    - src/context/useAuth.js                     (useAuth hook split)   ║
  ║    - src/context/auth-context-instance.js       (AuthContext ctx obj)  ║
  ║    - src/services/*.js                          (data-access layer)    ║
  ║    - src/components/common/ErrorBoundary.jsx                          ║
  ║    - src/components/common/ComingSoon.jsx                             ║
  ║    - src/components/common/DemoModeBanner.jsx                         ║
  ║    - src/pages/SettingsPage.jsx / DocumentsPage.jsx                   ║
  ║    - src/pages/NotFoundPage.jsx                                       ║
  ║    - src/pages/auth/ForgotPasswordPage.jsx                           ║
  ║    - supabase/migrations/0001_init_schema.sql   (NOT applied)         ║
  ║    - supabase/migrations/0002_rls_policies.sql (NOT applied)         ║
  ║    - docs/SUPABASE_SETUP.md                     (new)                  ║
  ║    - .env.example, .gitignore updates                                   ║
  ║                                                                       ║
  ║  What was NOT done in Phase 2 (deferred to Phase 3, requires approval):║
  ║    - Wiring services/* to real Supabase queries                      ║
  ║    - Applying SQL migrations to any database                          ║
  ║    - Building /reset-password page (link target for reset emails)    ║
  ║    - Phone/OTP or OAuth auth                                          ║
  ║    - Tailwind 3.x → 4.x upgrade (major rewrite, deferred)            ║
  ╚════════════════════════════════════════════════════════════════════╝
-->

# Environment Setup

> Phase 1 audit document. This file tells a new contributor how to
> clone, install, configure, and run the Stockwise frontend locally.
> **No real secret values are included.** Anywhere a value would
> normally be a secret, the placeholder `<<VALUE>>` is used.

## 1. Prerequisites (verified versions at audit time)

| Tool             | Required version (audit-tested)         | Notes                                                         |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Node.js          | `v24.21.0` (any `>= 20` should work)    | Vite 8 requires Node `>= 20.19` (or `>= 22.12`).              |
| npm              | `11.19.0` (any `>= 9` should work)      | Bundled with Node.                                            |
| Git              | any recent                              | Used for cloning.                                             |
| A modern browser | latest Chrome / Firefox / Safari / Edge | Dev server uses Vite + HMR; any modern browser works.        |

There is **no backend prerequisite** — the app is currently a
frontend-only prototype. All data is in-memory mock data. There is
**no database to install** and **no environment file to fill in** for
the current state of the project.

## 2. Clone the repository

```bash
# Using HTTPS (recommended for read-only access)
git clone https://github.com/haycee-sama/stockwise.git
cd stockwise

# Using SSH (if you have SSH keys set up with GitHub)
git clone git@github.com:haycee-sama/stockwise.git
cd stockwise
```

## 3. Install dependencies

The project uses npm and includes a committed `package-lock.json`.
Use `npm ci` (not `npm install`) for reproducible installs:

```bash
npm ci
```

This installs **260 packages** in ~7 seconds (on a modern laptop with
warm cache; cold cache is ~30 seconds).

The output will include a line like:

```
19 vulnerabilities (1 low, 3 moderate, 15 high)
```

See `FRONTEND_AUDIT.md` P1-005 for the details. The dev-only
vulnerabilities (Vite advisories) do not affect production builds.
The `react-router-dom` XSS advisory is production-relevant — it
should be fixed before deploying to a real domain. For local
development, **it is safe to proceed past the audit warnings**.

## 4. Available scripts

From `package.json` `scripts`:

```json
{
  "dev":     "vite",           // Start the Vite dev server with HMR
  "build":   "vite build",    // Production build → dist/
  "lint":    "eslint .",      // Lint all .js / .jsx files
  "preview": "vite preview"   // Serve the production build locally
}
```

There is **no `test` script**. There are no tests. There is no test
runner installed (no jest, no vitest, no playwright, no cypress).

## 5. Running the app locally

### 5.1 Development mode (with HMR)

```bash
npm run dev
```

Output:
```
  VITE v8.0.1  ready in ~200 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173/` in your browser. The app redirects to
`/login` because unauthenticated users cannot access any protected
route.

**Login (any credentials work in the current mock state):**
- Email: `any@valid.email` (must match regex `/\S+@\S+\.\S+/`)
- Password: any string of at least 6 characters

After login, you will land on `/dashboard`.

**Caveats during local development:**
1. **Session loss on refresh.** Refreshing any page redirects you to
   `/login`. See `FRONTEND_AUDIT.md` P1-001. This is a bug, not a
   configuration problem — there is no env var that fixes it.
2. **Dashboard CTAs log you out.** Clicking "Add Item" or "New Sale"
   from the dashboard uses `window.location.href = …` which triggers
   a refresh and therefore a logout (combining with caveat 1). See
   P1-003. Use the sidebar to navigate instead.
3. **New Sale modal crashes.** Clicking "New Sale" on the Sales page
   throws a React Rules-of-Hooks error and the modal does not render.
   See `FRONTEND_AUDIT.md` P1-002. The other modals (Add Item, Add
   Customer, Add Vendor, Add Expense) work fine.

### 5.2 Production build

```bash
npm run build
```

Output (at audit time):
```
vite v8.0.1 building client environment for production...
✓ 2329 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             0.82 kB │ gzip:  0.48 kB
dist/assets/index-BL3orxxf.css             40.10 kB │ gzip:  7.68 kB
dist/assets/inventoryIcons-Bv50q9i1.js      0.94 kB │ gzip:  0.52 kB
dist/assets/LoginPage-ekNplCUG.js           8.23 kB │ gzip:  2.48 kB
dist/assets/index-B6j_jSKL.js              10.63 kB │ gzip:  3.18 kB
dist/assets/SignupPage-C1nJP1_N.js         12.79 kB │ gzip:  3.56 kB
dist/assets/mockData-BhI6LN8b.js           23.91 kB │ gzip:  6.82 kB
dist/assets/ReportsPage-BZJQLB8J.js        24.91 kB │ gzip:  5.38 kB
dist/assets/ExpensesPage-DY07xg11.js       25.42 kB │ gzip:  6.65 kB
dist/assets/DashboardPage-BEncpuI1.js      29.23 kB │ gzip:  5.85 kB
dist/assets/CustomersPage-Cugk3MYn.js      32.50 kB │ gzip:  7.10 kB
dist/assets/InventoryPage-BPZn-bTz.js      32.63 kB │ gzip:  7.51 kB
dist/assets/SalesPage-CA-EPc8K.js          34.50 kB │ gzip:  7.36 kB
dist/assets/VendorsPage-CbOwb3hE.js        39.11 kB │ gzip:  8.30 kB
dist/assets/vendor-d3-BRAwAs8j.js          62.88 kB │ gzip: 20.40 kB
dist/assets/vendor-react-BvtrVenU.js      252.65 kB │ gzip: 81.49 kB
dist/assets/vendor-recharts-DnfHbHJs.js   320.89 kB │ gzip: 88.72 kB

✓ built in 1.15s
```

The build output lives in `dist/`. To preview it locally:

```bash
npm run preview
```

This serves `dist/` on `http://localhost:4173/`.

### 5.3 Lint

```bash
npm run lint
```

This currently fails with **30 errors** (see `FRONTEND_AUDIT.md`
P1-004 for the full breakdown). It is safe to ignore the lint failures
for the purpose of running the app, but they should be fixed before
the next phase of work.

## 6. Environment variables

**There are currently no environment variables.** The repo has no
`.env`, no `.env.example`, no `.env.local`, and no `import.meta.env.*`
references in the source. The app does not call any backend, so no
URL or API key is needed.

### 6.1 Variables the backend integration will require

When the backend exists, the following variables should be added.
Create a `.env.example` file in the repo root with these (without real
values) and a `.env.local` file (gitignored) with real values:

```bash
# API
VITE_API_BASE_URL=http://localhost:3000/api/v1     # Backend API base URL
VITE_API_TIMEOUT_MS=15000                          # Request timeout

# Auth (Phase 2 — see BACKEND_HANDOVER.md §1.4 for decision)
# Option A (HttpOnly refresh cookie): no token storage needed in env
# Option B (localStorage access token): nothing in env either; the
#           access token is stored by the API client at runtime

# Feature flags (optional)
VITE_ENABLE_NOTIFICATIONS=false                    # TopBar notification panel
VITE_ENABLE_BULK_UPLOAD=false                      # Inventory / Customers / Vendors
VITE_ENABLE_PDF_EXPORT=true                        # Reports

# Misc
VITE_SENTRY_DSN=                                   # Error reporting (optional)
VITE_APP_VERSION=$npm_package_version              # Auto from package.json
```

**Why `VITE_` prefix?** Vite only exposes env vars prefixed with
`VITE_` to client-side code via `import.meta.env.VITE_X`. Any other
env var is invisible to the browser bundle.

**Safe development practices:**
- Never commit `.env.local`, `.env.production`, or any file
  containing real tokens. The `.gitignore` already excludes
  `*.local` (see `.gitignore` line 13).
- For shared non-secret config (e.g. `VITE_API_BASE_URL` for a
  staging environment), use `.env` (committed) — but only put
  non-sensitive values there.
- For secrets like `VITE_SENTRY_DSN` (technically not secret since
  it's a public DSN, but treat as such), put in `.env.local`.
- **The frontend bundle is public.** Anything in `VITE_*` env vars
  is shipped to the browser. Never put a real secret (DB password,
  JWT signing key, OAuth client secret) in a `VITE_*` var. Secrets
  belong server-side only.

## 7. Common setup issues

### 7.1 Browserslist warning

`npm run build` prints:
```
Browserslist: browsers data (caniuse-lite) is 7 months old. Please run:
npx update-browserslist-db@latest
```

This is informational, not an error. To fix:
```bash
npx update-browserslist-db@latest
```
Then commit the resulting lockfile change.

### 7.2 Port conflict

If port `5173` is already in use, Vite will pick the next available
port automatically and print `Local: http://localhost:5174/`. To
force a specific port:
```bash
npm run dev -- --port 5174
```

### 7.3 Node version mismatch

If `npm run dev` fails with `Error: vite: command not found` or
similar, ensure you are using Node `>= 20.19`. Use `nvm` or `fnm` to
manage versions:
```bash
nvm install 24
nvm use 24
```

### 7.4 Vite pre-bundling issues

If you see `Failed to resolve entry for package "X"`, clear Vite's
pre-bundle cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

## 8. IDE / editor setup

The repo does not include `.vscode/` or `.idea/` config. Recommended
VS Code extensions (manual install):
- ESLint (`dbaeumer.vscode-eslint`) — will surface the 30 lint errors
  inline as you edit.
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`) — autocomplete
  for Tailwind classes.
- Prettier (`esbenp.prettier-vscode`) — code formatting. **Note: no
  Prettier config exists in the repo.** A `.prettierrc` should be
  added before format-on-save is enabled, otherwise Prettier will use
  its defaults which may diverge from the existing style.

A `.editorconfig` is also missing and would be a good addition.

## 9. CI / deployment

There is currently **no CI configuration** (no `.github/workflows/`,
no `.gitlab-ci.yml`, no `circleci/config.yml`). A minimal GitHub
Actions workflow should:

```yaml
# .github/workflows/ci.yml (proposed, NOT committed)
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint         # currently fails — gate CI until lint is fixed
      - run: npm run build
      # - run: npm test           # uncomment when tests exist
```

Deployment: the build output `dist/` is a static SPA. Any static host
works (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages).
For SPA routing to work, the host must redirect all paths to
`/index.html` (the catch-all). See host-specific docs:
- Vercel: add `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` to `vercel.json`.
- Netlify: create `public/_redirects` with `/*    /index.html   200`.
- Cloudflare Pages: app-level setting "Single Page Application".

## 10. Security checklist for production deployment

Once the backend exists and the app is deployed:

- [ ] HTTPS-only — redirect all HTTP to HTTPS.
- [ ] HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
- [ ] CSP (Content-Security-Policy) header restricting script sources.
- [ ] `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`) to
      prevent clickjacking.
- [ ] `X-Content-Type-Options: nosniff`.
- [ ] No sensitive data in `VITE_*` env vars.
- [ ] Source maps shipped only to an error-tracking service (Sentry),
      not the public CDN.
- [ ] Dependency vulnerabilities resolved (`npm audit fix` and
      manual bumps for `vite` and `react-router-dom`).
- [ ] Lint clean (`npm run lint` exits 0).
- [ ] Tests pass (none today — add at least a smoke test).
- [ ] Error boundary wraps every lazy page.
- [ ] Auth token refresh works on 401.
- [ ] Logout invalidates the refresh token server-side.

## 11. What was NOT changed during this audit

- No `.env` or `.env.example` file was created (none is needed today).
- No `.github/workflows/` was created.
- No `.vscode/` or `.editorconfig` was created.
- No `vite.config.js` changes were made.
- No `package.json` dependencies were added or upgraded.
- No source files were modified.

These are recommendations for the next phase, not changes applied in
this audit phase.

## 12. Quick start (TL;DR)

```bash
git clone https://github.com/haycee-sama/stockwise.git
cd stockwise
npm ci
npm run dev
# Open http://localhost:5173/ in your browser
# Login with any email + any 6+ char password
```

If something breaks, refer to `TESTING_REPORT.md` for the exact
commands run during the audit and their output.
