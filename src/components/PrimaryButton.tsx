import Link from "next/link";

import { cn } from "@/lib/utils";

const primaryClassName =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-primary px-5 text-center text-base leading-snug font-semibold text-primary-ink transition-opacity touch-manipulation hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-disabled disabled:text-ink-muted disabled:opacity-100";

type PrimaryButtonProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "onClick">;

export function PrimaryButton({
  children,
  className,
  href,
  type = "button",
  ...props
}: PrimaryButtonProps) {
  const classes = cn(primaryClassName, className);

  if (href) {
    return (
      <Link href={href} className={classes} onClick={props.onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
