import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { cn } from "@/lib/utils";

type MoneyBrandHeaderProps = {
  className?: string;
  size?: "sm" | "md";
};

/** Compact brand anchor — question-first screens keep this small in the header. */
export function MoneyBrandHeader({ className, size = "sm" }: MoneyBrandHeaderProps) {
  return (
    <header className={cn("pt-4 pb-2", className)}>
      <MarshmallowLogo size={size} showMascot />
    </header>
  );
}
