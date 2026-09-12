import { cn } from "@/lib/utils";

/**
 * The design is mobile-first: a 480px phone frame centred on a subtle ground
 * on wide screens, full-bleed on phones. Every public AgroAlert screen renders
 * inside it.
 */
export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-svh flex-1 justify-center text-[18px]">
      <div className="bg-background flex min-h-svh w-full max-w-[480px] flex-col shadow-lg">
        {children}
      </div>
    </div>
  );
}

/** Padded body of a screen; grows so the `StickyBar` sits at the bottom. */
export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-1 flex-col px-5 pt-[26px] pb-[18px]", className)}
    >
      {children}
    </div>
  );
}
