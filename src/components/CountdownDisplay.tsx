import { cn } from "@/lib/utils";

type CountdownDisplayProps = {
  value: string;
  caption?: string;
  className?: string;
};

export function CountdownDisplay({
  value,
  caption,
  className,
}: CountdownDisplayProps) {
  return (
    <div className={cn("text-center", className)}>
      {caption ? (
        <p className="mb-2 text-sm font-medium text-ink-muted">{caption}</p>
      ) : null}
      <p className="font-display text-5xl leading-none font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}
