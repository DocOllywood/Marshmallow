"use client";

import { useActionState } from "react";
import Link from "next/link";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/server/actions/auth";

const fieldClass = "min-h-12 rounded-xl bg-surface px-3 text-base";

export function SignInForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(signInAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <EmailField />
      <PasswordField autoComplete="current-password" />
      <AuthMessage state={state} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </PrimaryButton>
      <p className="text-sm text-ink-muted">
        <Link href="/forgot-password" className="underline-offset-2 hover:underline">
          Forgot password
        </Link>
        {" · "}
        <Link href="/signup" className="underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({
  nextPath,
  shareId,
}: {
  nextPath?: string;
  shareId?: string;
}) {
  const [state, action, pending] = useActionState(signUpAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      {shareId ? <input type="hidden" name="share" value={shareId} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          minLength={3}
          maxLength={24}
          className={fieldClass}
          required
        />
      </div>
      <EmailField />
      <PasswordField autoComplete="new-password" />
      <AuthMessage state={state} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </PrimaryButton>
      <p className="text-sm text-ink-muted">
        Already in?{" "}
        <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"} className="underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
      <p className="text-xs text-ink-muted">
        <Link href="/privacy">Privacy</Link>
        {" · "}
        <Link href="/terms">Terms</Link>
        {" · "}
        <Link href="/community">Community</Link>
        <span className="block mt-1">Drafts for attorney review.</span>
      </p>
    </form>
  );
}

function EmailField() {
  return (
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
  );
}

function PasswordField({ autoComplete }: { autoComplete: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        name="password"
        type="password"
        autoComplete={autoComplete}
        minLength={8}
        className={fieldClass}
        required
      />
    </div>
  );
}

function AuthMessage({ state }: { state: AuthActionState }) {
  if (!state?.error) {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-toasted">
      {state.error}
    </p>
  );
}
