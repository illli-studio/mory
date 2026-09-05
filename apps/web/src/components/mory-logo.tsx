import { cn } from "../lib/utils";

export function MoryLogo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      className={cn("mory-logo", className)}
      width={size}
      height={size}
      src="/mory-logo-premium.svg"
      alt="Mory"
      role="img"
    />
  );
}
