import { z } from "zod";

import { signUpSchema } from "@/lib/validations/username";

export { signUpSchema } from "@/lib/validations/username";

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
