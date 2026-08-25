import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tsconfigPaths(), react()],
    test: {
      environment: "jsdom",
      env,
      include: [
        "tests/domain/**/*.test.ts",
        "tests/lib/**/*.test.ts",
        "tests/components/**/*.test.ts",
        "tests/components/**/*.test.tsx",
        "tests/rls/**/*.test.ts",
      ],
      fileParallelism: false,
      testTimeout: 60000,
      hookTimeout: 60000,
    },
  };
});
