import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .max(48, "Display name must be 48 characters or fewer.");

export const onboardingTopicsSchema = z
  .array(z.string().uuid())
  .min(1, "Pick at least one world to continue.");
