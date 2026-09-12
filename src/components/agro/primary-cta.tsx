import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Full-width, 60px ink button that closes every wizard screen. It lives in
 * the screen's `StickyBar`, which owns the spacing around it — the button
 * itself carries no margin.
 */
export function PrimaryCta({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="lg"
      className={cn(
        "h-[60px] w-full rounded-[var(--radius-md)] text-[19px] font-medium",
        className,
      )}
      {...props}
    />
  );
}
