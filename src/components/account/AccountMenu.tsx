"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { signOutAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  username: string;
  className?: string;
};

export function AccountMenu({ username, className }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${username}`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full px-2 py-1 text-sm font-semibold text-ink touch-manipulation hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        @{username}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-30 mt-2 min-w-[10rem] rounded-xl border border-border bg-surface py-1 shadow-sm"
        >
          <Link
            href="/settings"
            role="menuitem"
            className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            className="block px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <form action={signOutAction} role="none">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
            >
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
