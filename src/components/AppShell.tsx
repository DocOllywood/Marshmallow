import { cn } from "@/lib/utils";

import { BottomNav } from "@/components/BottomNav";
import { ReadyAttention } from "@/components/ReadyAttention";

type AppShellProps = {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
  readyCount?: number;
};

export function AppShell({
  children,
  showNav = false,
  className,
  readyCount = 0,
}: AppShellProps) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <ReadyAttention readyCount={readyCount} />
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4",
          showNav && "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </div>
      {showNav ? <BottomNav readyCount={readyCount} /> : null}
    </div>
  );
}
