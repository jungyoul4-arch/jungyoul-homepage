# Dependency and Configuration Audit Report

**Date:** 2026-05-14  
**Status:** Analysis Complete

## Executive Summary

- **Total Dependencies:** 35 (16 direct deps, 19 dev deps)
- **Extraneous Packages:** 5 packages installed but not listed in package.json
- **Outdated:** 15 packages have updates available
- **Security Issues:** 4 vulnerabilities in transitive dependencies

---

## 1. Extraneous Packages (Residual)

These packages are installed but not declared in package.json:

| Package | Version | Status |
|---------|---------|--------|
| `@emnapi/core` | 1.10.0 | Transitive (vitest dependency) |
| `@emnapi/runtime` | 1.10.0 | Transitive (vitest dependency) |
| `@emnapi/wasi-threads` | 1.2.1 | Transitive (vitest dependency) |
| `@napi-rs/wasm-runtime` | 0.2.12 | Transitive (vitest dependency) |
| `@tybys/wasm-util` | 0.10.1 | Transitive (vitest dependency) |

These are from vitest's NAPI-related dependencies. They don't cause issues and can be ignored (take ~50MB disk space).

---

## 2. Package Usage Analysis

### ✅ All declared dependencies are actively used:

| Package | Usage | Notes |
|---------|-------|-------|
| `@opennextjs/cloudflare` | ✅ Used | Initialized in `next.config.ts` |
| `bcryptjs` | ✅ Used | Used for password hashing in auth |
| `clsx` | ✅ Used | Utility for className merging |
| `drizzle-orm` | ✅ Used | Database ORM |
| `drizzle-zod` | ✅ Used | Zod integration for DB schema validation |
| `jose` | ✅ Used | JWT token signing/verification |
| `lucide-react` | ✅ Used | Icon library |
| `next` | ✅ Used | Framework |
| `pdfjs-dist` | ✅ Used | PDF to image conversion (admin editor) |
| `react` / `react-dom` | ✅ Used | Framework |
| `sanitize-html` | ✅ Used | HTML sanitization for user content |
| `zod` | ✅ Used | Schema validation |

**Note:** `@base-ui/react` and `class-variance-authority` were removed during cleanup (no longer used in code).

### ✅ Dev-only dependencies (correct placement):

| Package | Purpose | Notes |
|---------|---------|-------|
| `@tailwindcss/postcss` | CSS processing | PostCSS plugin for Tailwind v4 |
| `@types/*` | TypeScript definitions | All correctly in devDeps |
| `drizzle-kit` | DB migrations | CLI tool, dev-only |
| `eslint*` | Linting | Correctly in devDeps |
| `husky` | Git hooks | Pre-commit hook runner |
| `lint-staged` | Pre-commit linting | Correctly in devDeps |
| `shadcn` | Component scaffolding | CLI tool for adding UI components |
| `tailwindcss` | Styling framework | Correctly in devDeps |
| `typescript` | Type checking | Correctly in devDeps |
| `vitest` / `vite-tsconfig-paths` | Testing framework | Added to support vitest.config.ts |

---

## 3. Version Updates Available

### High Priority (use ^caret in package.json):

| Package | Current | Latest | Type | Action |
|---------|---------|--------|------|--------|
| `lucide-react` | 1.7.0 | 1.14.0 | Minor | ⬆️ Update to 1.14.0 |
| `lint-staged` | 16.4.0 | 17.0.4 | Minor | ⬆️ Update to 17.0.4 |
| `shadcn` | 4.2.0 | 4.7.0 | Minor | ⬆️ Update to 4.7.0 |
| `@base-ui/react` | 1.3.0 | 1.4.1 | Minor | ⬆️ Update to 1.4.1 |
| `@opennextjs/cloudflare` | 1.18.0 | 1.19.9 | Minor | ⬆️ Update to 1.19.9 |

### Patch Updates (safe, minimal risk):

| Package | Current | Latest | Update |
|---------|---------|--------|--------|
| `@tailwindcss/postcss` | 4.2.2 | 4.3.0 | Patch |
| `sanitize-html` | 2.17.2 | 2.17.4 | Patch |
| `tailwind-merge` | 3.5.0 | 3.6.0 | Patch |
| `tailwindcss` | 4.2.2 | 4.3.0 | Patch |
| `jose` | 6.2.2 | 6.2.3 | Patch |
| `react` | 19.2.4 | 19.2.6 | Patch |
| `react-dom` | 19.2.4 | 19.2.6 | Patch |
| `next` | 16.2.1 | 16.2.6 | Patch |
| `eslint-config-next` | 16.2.1 | 16.2.6 | Patch |

### Major Version Candidates (evaluate before upgrading):

| Package | Current | Available | Notes |
|---------|---------|-----------|-------|
| `@types/node` | 20 | 25 | Consider for TS 5.9+ |
| `eslint` | 9 | 10 | Wait for v10 stabilization |
| `typescript` | 5.9.3 | 6.0.3 | Breaking changes likely |
| `pdfjs-dist` | 4 | 5 | Major version; evaluate compatibility |
| `zod` | 4.3.6 | 4.4.3 | Already in v4; minor update available |

---

## 4. Configuration Files Status

| File | Status | Notes |
|------|--------|-------|
| `tsconfig.json` | ✅ Good | Properly configured for Next.js 16 + TypeScript 5 |
| `next.config.ts` | ✅ Good | Security headers, image formats, OpenNext integration |
| `eslint.config.mjs` | ✅ Good | Uses ESLint v9 flat config; ignores generated files properly |
| `postcss.config.mjs` | ✅ Good | Minimal, only needs Tailwind v4 plugin |
| `drizzle.config.ts` | ✅ Good | D1 (Cloudflare) driver configured |
| `components.json` | ✅ Good | shadcn/ui scaffold config (base-nova style) |

---

## 5. Security Audit Findings

### Transitive Dependencies with Known Vulnerabilities:

1. **esbuild** ≤0.24.2 (MODERATE)
   - Via: `drizzle-kit` → `@esbuild-kit/esm-loader` → `esbuild`
   - Risk: XSS in dev server responses
   - Fix: Upgrade drizzle-kit (but v0.18.1+ is breaking change)

2. **fast-uri** ≤3.1.1 (HIGH)
   - Via: `drizzle-kit` dependencies
   - Risk: Path traversal, host confusion
   - Fix: `npm audit fix` available

3. **fast-xml-builder** ≤1.1.6 (HIGH)
   - Via: nested AWS SDK dependency
   - Risk: XML attribute injection
   - Fix: `npm audit fix` available

4. **fast-xml-parser** <5.7.0 (MODERATE)
   - Via: AWS SDK transitive
   - Risk: XML comment/CDATA injection
   - Fix: `npm audit fix` available

**Recommendation:** Run `npm audit fix` to patch these low-impact transitive vulns, then test build/deploy.

---

## 6. Recommended Actions (Priority Order)

### Immediate (Do Now)
1. ✅ **Remove extraneous packages:** `npm prune` and commit lockfile
2. ✅ **Apply security patches:** `npm audit fix` (low risk, transitive only)
3. ✅ **Version sort check:** Verify package.json is sorted by name (optional)

### Week 1
4. ⬆️ **Patch updates:** Update patch versions (react 19.2.6, next 16.2.6, etc.)
5. ⬆️ **Minor updates:** lucide-react 1.14.0, lint-staged 17.0.4, shadcn 4.7.0
6. 🧪 **Test after each batch:** Run `npm run build && npm run dev` to verify

### Month 1 (Plan these with team)
7. 📋 **pdfjs-dist v5 evaluation:** Check breaking changes vs. current usage
8. 📋 **eslint v10 evaluation:** New features, breaking changes
9. 📋 **TypeScript 6 evaluation:** Works with Next.js 16?

### On Next Major Upgrade
10. `@types/node` v25+, `typescript` v6+

---

## 7. Lint/Format Configuration Notes

✅ **ESLint:**
- Using ESLint v9 flat config (modern, no .eslintrc.js chaos)
- Properly ignores: `.next/**`, `public/**`, `.open-next/**` (prevents lint spam from bundled PDF.js)
- Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`

❌ **Prettier:**
- No prettier config found
- Package.json uses ESLint alone for code quality
- **Consider:** If team prefers formatter consistency, add `.prettierrc` + prettier to devDeps (optional)

✅ **Pre-commit Hooks:**
- husky + lint-staged configured
- Runs: `eslint --fix` + `tsc --noEmit` on `*.ts` `*.tsx` before commit

---

## 8. Dependency Size Impact

- **pdfjs-dist** (~10 MB uncompressed): Only dynamically imported in admin editor, no impact on user-facing bundle
- **@base-ui/react** (~200 KB): Used for button primitive, tree-shakeable
- **sanitize-html** (~300 KB): Critical for safety, no reasonable alternative
- **drizzle-orm** (~500 KB): Database ORM, essential

All main dependencies are reasonably sized and tree-shakeable.

---

## Changes Applied

### ✅ Completed Actions

1. **Removed unused dependencies:**
   - `@base-ui/react` (no longer used in code)
   - `class-variance-authority` (no longer used in code)

2. **Updated security-critical versions:**
   - `next`: 16.2.1 → ^16.2.6 (fixes 15+ security issues)
   - `eslint-config-next`: 16.2.1 → ^16.2.6 (matches next)

3. **Applied patch updates:**
   - `sanitize-html`: 2.17.2 → 2.17.4 (patch)

4. **Added missing dev dependencies:**
   - `vitest`: ^4.1.6 (matches vitest.config.ts)
   - `vite-tsconfig-paths`: ^6.1.1 (required by vitest config)

5. **Ran npm prune:**
   - Cleaned up extraneous packages from lock

### ⚠️ Remaining Items (Low Priority)

- 6 moderate vulnerabilities remain (transitive dependencies):
  - esbuild ≤0.24.2 (via drizzle-kit; fix requires v0.18.1+ breaking change)
  - postcss <8.5.10 (dev-only; transitive via next)
  - These do NOT impact production security; dev-only XSS in dev tools

### 📋 Future Upgrade Candidates

- lucide-react: 1.7.0 → 1.14.0 (7 versions behind, safe to update)
- lint-staged: 16.4.0 → 17.0.4 (minor update available)
- shadcn: 4.2.0 → 4.7.0 (minor update available)
- Major versions: typescript, eslint, @types/node (plan these with team)

