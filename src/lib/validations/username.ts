import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "marshmallow",
  "support",
  "help",
  "api",
  "www",
  "moderator",
  "mod",
  "system",
  "root",
  "official",
  "notifications",
  "settings",
  "login",
  "signup",
] as const;

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isReservedUsername(username: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(
    normalizeUsername(username),
  );
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(USERNAME_MIN)
      .max(USERNAME_MAX)
      .regex(USERNAME_PATTERN, "Use lowercase letters, numbers, and underscores.")
      .refine((value) => !value.startsWith("_") && !value.endsWith("_"), {
        message: "Username cannot start or end with an underscore.",
      })
      .refine((value) => !value.includes("__"), {
        message: "Username cannot contain consecutive underscores.",
      })
      .refine((value) => !isReservedUsername(value), {
        message: "That username is reserved.",
      }),
  );

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: usernameSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
