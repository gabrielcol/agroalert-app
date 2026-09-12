"use client";

import { Bell, MessageSquare, Phone, type LucideIcon } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CHANNELS, type ChannelId } from "@/lib/agro/mock-data";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ICONS: Record<ChannelId, LucideIcon> = {
  sms: MessageSquare,
  call: Phone,
  app: Bell,
};

/** "How do you want to receive alerts?" — single choice between channels. */
export function ChannelOptions({
  value,
  onChange,
}: {
  value: ChannelId;
  onChange: (next: ChannelId) => void;
}) {
  const t = useT();
  const c = t.agro.rezumat.channel;

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as ChannelId)}
      className="mt-1.5 gap-2.5"
      aria-label={c.title}
    >
      {CHANNELS.map((id) => {
        const Icon = ICONS[id];
        const selected = id === value;
        return (
          <label
            key={id}
            className={cn(
              "border-input flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border-[1.5px] px-4 py-3.5 transition-colors",
              selected && "border-brand bg-accent",
            )}
          >
            <span
              className={cn(
                "bg-secondary text-muted-foreground grid size-9 shrink-0 place-items-center rounded-[9px]",
                selected && "bg-card text-brand",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">
                {c[id].title}
              </span>
              <span className="text-subtle mt-px block text-sm">
                {c[id].sub}
              </span>
            </span>
            <RadioGroupItem
              value={id}
              className="border-input data-checked:border-brand data-checked:bg-brand ml-auto size-5 border-[1.5px]"
            />
          </label>
        );
      })}
    </RadioGroup>
  );
}
