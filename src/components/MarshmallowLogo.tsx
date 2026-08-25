import { cn } from "@/lib/utils";

type MarshmallowLogoProps = {
  className?: string;
  size?: "sm" | "md";
};

export function MarshmallowLogo({ className, size = "md" }: MarshmallowLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-display font-semibold tracking-tight text-ink",
        size === "sm" ? "text-xl" : "text-2xl",
        className,
      )}
    >
      Marshmallow
    </span>
  );
}
