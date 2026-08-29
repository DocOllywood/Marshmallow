import { afterEach, describe, expect, it, vi } from "vitest";

import { isDevEnvironment } from "@/lib/env/dev-only";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isDevEnvironment", () => {
  it("returns false in production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevEnvironment()).toBe(false);
  });

  it("returns true outside production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevEnvironment()).toBe(true);
  });
});
