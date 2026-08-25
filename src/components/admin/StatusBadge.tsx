import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["marshmallow_status"];

const STYLES: Record<Status, string> = {
  draft: "bg-surface text-ink-muted border-border",
  scheduled: "bg-surface-elevated text-ink border-border",
  open: "bg-primary/10 text-primary border-primary/30",
  closed: "bg-warning/10 text-warning border-warning/30",
  cancelled: "bg-toasted-canvas text-toasted border-toasted/30",
  revealed: "bg-positive/10 text-positive border-positive/30",
  archived: "bg-disabled/40 text-ink-muted border-border",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
