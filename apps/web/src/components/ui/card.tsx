import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const Card = forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"section">>(({ className, children, ...props }, ref) => (
  <section ref={ref} data-slot="card" className={cn("rounded-[var(--radius-ui)] border border-border bg-card text-card-foreground shadow-sm", className)} {...props}>
    {children}
  </section>
));

Card.displayName = "Card";
