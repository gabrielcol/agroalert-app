import { cn } from "@/lib/utils";

/**
 * A selectable card (crop, variety). Single-select is handled by the parent;
 * the card only reports clicks and renders its pressed state.
 */
export function ChoiceCard({
  selected,
  onSelect,
  className,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "bg-card border-input hover:border-brand-line focus-visible:ring-ring/50 w-full rounded-[var(--radius-lg)] border-[1.5px] px-[18px] py-4 text-left transition-colors outline-none focus-visible:ring-3",
        selected && "border-brand bg-accent hover:border-brand",
        className,
      )}
    >
      {children}
    </button>
  );
}
