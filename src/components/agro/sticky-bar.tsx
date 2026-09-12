import { cn } from "@/lib/utils";

/**
 * The action bar every phone screen ends with: a solid strip stuck to the
 * bottom of the phone column, so the next tap is always on screen. It is the
 * last flex child of the column, so it reserves its own space and the end of
 * the content clears it — but while the page is taller than the viewport
 * `sticky bottom-0` floats it over whatever is scrolling past, which is why it
 * needs an opaque background and a z-index. The bottom padding clears the home
 * indicator; `viewport-fit=cover` in the (agro) layout makes that inset real.
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
