"use client";

import { useActionState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordAction,
  resetPasswordAction,
} from "@/server/actions/auth";

const fieldClass = "min-h-12 rounded-xl bg-surface px-3 text-base";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={fieldClass}
          required
        />
      </div>
      {state?.error ? (
        <p role="status" className="text-sm text-ink-muted">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </PrimaryButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className={fieldClass}
          required
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-toasted">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </PrimaryButton>
    </form>
  );
}
