import { cn } from "@/lib/utils";

type ChoiceButtonProps = {
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function ChoiceButton({
  selected = false,
  children,
  className,
  type = "button",
  ...props
}: ChoiceButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "flex min-h-16 w-full items-center justify-center rounded-2xl border-2 px-4 text-lg font-semibold tracking-wide uppercase touch-manipulation transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        selected
          ? "border-ink bg-surface-elevated text-ink"
          : "border-border bg-surface text-ink hover:border-ink/40",
        "disabled:border-border disabled:bg-disabled/40 disabled:text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
