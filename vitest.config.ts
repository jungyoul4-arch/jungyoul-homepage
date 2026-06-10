import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // happy-dom 사용 시 iframe 자동 fetch 비활성 — embed 좌표 보존 테스트가
    // DNS lookup 으로 stderr 노이즈를 내는 것 방지. happy-dom env 를 안 쓰는 다른
    // 테스트에는 영향 없음.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableIframePageLoading: true,
        },
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/validation.ts", "src/lib/auth.ts", "src/lib/admin-auth.ts", "src/lib/anon-session.ts", "src/lib/site.ts"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      reporter: ["text", "lcov"],
    },
  },
});
