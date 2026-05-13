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
    // public/pdfjs/pdf.worker.min.mjs alone contributed ~99% of lint output and
    // drowned real source-code warnings. Other public/* are SVG/ICO assets that
    // ESLint should not be parsing.
    "public/**",
    ".open-next/**",
    ".wrangler/**",
    "graphify-out/**",
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
