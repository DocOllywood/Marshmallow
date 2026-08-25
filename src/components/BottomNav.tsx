"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, House, Trophy, User } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/today", label: "Today", icon: Flame },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/profile", label: "You", icon: User },
] as const;

export function BottomNav({ readyCount = 0 }: { readyCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-sm"
    >
      <ul className="mx-auto grid max-w-[430px] grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const showReady = item.href === "/home" && readyCount > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={showReady ? `Home, ${readyCount} ready` : item.label}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-ink-muted",
                )}
              >
                <span className="relative">
                  <Icon
                    aria-hidden
                    className="size-5"
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  {showReady ? (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1.5 min-w-3.5 rounded-full bg-primary px-0.5 text-center text-[9px] leading-3.5 font-semibold text-canvas"
                    >
                      {readyCount > 9 ? "9+" : readyCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
