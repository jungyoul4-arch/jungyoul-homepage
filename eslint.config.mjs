import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored / generated assets — not source we control or want lint signal on.
    // public/* are SVG/ICO/static assets that ESLint should not be parsing.
    "public/**",
    ".open-next/**",
    ".wrangler/**",
    "graphify-out/**",
    ".playwright-mcp/**",
    // vitest coverage v8 reporter 생성물 — .gitignore 에도 등재.
    "coverage/**",
  ]),
]);

export default eslintConfig;
