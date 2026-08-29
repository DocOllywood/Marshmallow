import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { cn } from "@/lib/utils";

type MarshmallowLogoProps = {
  className?: string;
  size?: "sm" | "md";
  showMascot?: boolean;
};

export function MarshmallowLogo({ className, size = "md", showMascot = false }: MarshmallowLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display font-semibold tracking-tight text-ink",
        size === "sm" ? "text-xl" : "text-2xl",
        className,
      )}
    >
      {showMascot ? <MarshmallowMascot state="fluffy" size="sm" aria-hidden /> : null}
      Marshmallow
    </span>
  );
}
