import { cn } from "../../lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span data-slot="badge" className={cn("inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors", className)}>{children}</span>;
}
