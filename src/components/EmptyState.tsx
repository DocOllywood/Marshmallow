import {
  MarshmallowMascot,
  type MascotState,
} from "@/components/MarshmallowMascot";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  mascot?: MascotState;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  mascot = "fluffy",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <MarshmallowMascot state={mascot} size="lg" />
      <h2 className="mt-6 font-display text-2xl leading-tight font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-[20rem] text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action ? <div className="mt-6 w-full">{action}</div> : null}
    </div>
  );
}
