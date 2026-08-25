import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined || value === null ? undefined : value;

export const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional(),
);

export const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

const optionalBool = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}, z.boolean().optional());

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalSecret,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  CRON_SECRET: optionalSecret,
  EMAIL_SENDING_ENABLED: optionalBool,
  EMAIL_PROVIDER: z.preprocess(
    emptyToUndefined,
    z.enum(["noop", "resend"]).optional(),
  ),
  RESEND_API_KEY: optionalSecret,
  EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return serverEnvSchema.parse({
    NODE_ENV: source.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: source.CRON_SECRET,
    EMAIL_SENDING_ENABLED: source.EMAIL_SENDING_ENABLED,
    EMAIL_PROVIDER: source.EMAIL_PROVIDER,
    RESEND_API_KEY: source.RESEND_API_KEY,
    EMAIL_FROM: source.EMAIL_FROM,
  });
}
