import { cn } from "@/lib/utils";

/**
 * The action bar every phone screen ends with: a solid strip stuck to the
 * bottom of the phone column, so the next tap is always on screen. It is a
 * normal flex child at the end of the column, not an overlay — content scrolls
 * *to* it, never underneath it. The bottom padding clears the home indicator.
 */
export function StickyBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background sticky bottom-0 z-20 border-t px-5 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
