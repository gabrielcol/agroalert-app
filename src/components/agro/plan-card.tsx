import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A section of the sowing plan: icon + bold title, then rows. */
export function PlanCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "mt-[18px] block gap-0 rounded-[var(--radius-xl)] p-5 text-base shadow-sm",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-2.5">
        <span className="bg-accent text-brand grid size-8 shrink-0 place-items-center rounded-[9px]">
          <Icon className="size-[17px]" />
        </span>
        <b className="text-lg font-semibold">{title}</b>
      </div>
      {children}
    </Card>
  );
}

/** Highlighted sowing window inside the "when to sow" card. */
export function WindowBox({ range, note }: { range: string; note: string }) {
  return (
    <div className="bg-accent border-brand-line mt-3 rounded-[var(--radius-md)] border p-4 text-center">
      <div className="text-brand text-2xl font-semibold tracking-tight">
        {range}
      </div>
      <div className="text-subtle mt-1 text-[14.5px]">{note}</div>
    </div>
  );
}

export function AlertRow({
  icon: Icon,
  tone,
  title,
  sub,
}: {
  icon: LucideIcon;
  tone: "warning" | "ok";
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-t py-3">
      <span
        className={cn(
          "mt-px grid size-[26px] shrink-0 place-items-center rounded-full",
          tone === "ok"
            ? "bg-success-subtle text-success"
            : "bg-warning-subtle text-warning",
        )}
      >
        <Icon className="size-[13px]" />
      </span>
      <span className="text-[15.5px]">
        {title}
        <span className="text-subtle mt-0.5 block text-sm">{sub}</span>
      </span>
    </div>
  );
}
