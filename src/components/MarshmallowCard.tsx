import { cn } from "@/lib/utils";

type MarshmallowCardProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "waiting" | "toasted";
};

export function MarshmallowCard({
  children,
  className,
  tone = "default",
}: MarshmallowCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-[1.75rem] border p-5",
        tone === "default" && "border-border bg-surface",
        tone === "waiting" && "border-border bg-surface",
        tone === "toasted" && "border-toasted/30 bg-toasted-canvas",
        className,
      )}
    >
      {children}
    </section>
  );
}
