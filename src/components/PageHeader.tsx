import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("pt-6 pb-4", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight text-ink">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
      ) : null}
    </header>
  );
}
