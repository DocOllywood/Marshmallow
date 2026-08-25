import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({
  label = "Warming up…",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 py-16",
        className,
      )}
    >
      <MarshmallowMascot state="fluffy" size="md" />
      <p className="text-sm font-medium text-ink-muted">{label}</p>
    </div>
  );
}
