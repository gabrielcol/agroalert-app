import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Green pill with a leading dot: "Recomandat", "Activ". */
export function SuccessBadge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "bg-success-subtle text-success h-[22px] gap-[5px] px-2 text-xs",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </Badge>
  );
}

/** Neutral pill for variety facts: "Rezistență secetă: mare". */
export function FactBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className="border-border text-muted-foreground h-[22px] border px-2 text-xs"
    >
      {children}
    </Badge>
  );
}
