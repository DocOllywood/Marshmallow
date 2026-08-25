import { describe, expect, it } from "vitest";

import { formatDuration } from "@/lib/format/duration";
import { parseServerEnv } from "@/lib/env/schema";
import { signInSchema } from "@/lib/validations/auth";

describe("formatDuration", () => {
  it("renders hours, minutes, and seconds", () => {
    expect(formatDuration(1 * 3600 + 17 * 60 + 42)).toBe("01:17:42");
  });

  it("does not go negative", () => {
    expect(formatDuration(-12)).toBe("00:00:00");
  });
});

describe("environment validation", () => {
  it("allows a local app without Supabase secrets", () => {
    const env = parseServerEnv({ NODE_ENV: "test" });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    const env = parseServerEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});

describe("auth schemas", () => {
  it("rejects a short password", () => {
    const result = signInSchema.safeParse({
      email: "sam@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});
