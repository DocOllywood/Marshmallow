import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function ErrorState({
  title = "Something got toasted.",
  description = "Try that again in a moment.",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-4 py-16 text-center",
        className,
      )}
    >
      <MarshmallowMascot state="toasted" size="lg" />
      <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-[20rem] text-sm leading-6 text-ink-muted">
        {description}
      </p>
    </div>
  );
}
