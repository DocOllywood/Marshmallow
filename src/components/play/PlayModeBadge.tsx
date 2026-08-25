import { playModeBadge, type PlayMode } from "@/domain/play/mode";
import { cn } from "@/lib/utils";

const MODE_TONE: Record<PlayMode, string> = {
  quick: "text-mode-quick",
  live: "text-mode-live",
  daily: "text-mode-daily",
};

export function PlayModeBadge({
  mode,
  className,
}: {
  mode: PlayMode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-xs font-semibold tracking-[0.16em] uppercase",
        MODE_TONE[mode],
        className,
      )}
    >
      {playModeBadge(mode)}
    </span>
  );
}
