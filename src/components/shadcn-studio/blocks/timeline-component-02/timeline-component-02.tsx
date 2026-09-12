"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * shadcn Studio block `timeline-component-02`, adapted for the 480px phone
 * shell: single column (the vendor's alternating `md:` layout is viewport-based
 * and would fire inside the phone column on a desktop browser), no marketing
 * heading, dots stuck under the phone header (`top-24`, `z-10` below the
 * header's and sticky bar's `z-20`). The scroll-driven line fill and active
 * state come from `motion/react` and use the window as scroll container,
 * which is what the phone shell relies on (no inner overflow container).
 *
 * Layout is measured inside observer/animation-frame callbacks so nothing
 * reads refs during render (react-hooks v7 `refs` / `set-state-in-effect`).
 */

export interface TimelineEntry {
  title: string;
  content: ReactNode;
}

export default function Timeline({
  data,
  dimmed = false,
}: {
  data: TimelineEntry[];
  /** Force every node inactive (e.g. before the Sowing Date is known). */
  dimmed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState({ top: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const dots = root.querySelectorAll<HTMLElement>("[data-timeline-dot]");
      const first = dots[0];
      const last = dots[dots.length - 1];
      if (!first || !last) return;
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const top = firstRect.top + firstRect.height / 2 - rect.top;
      const bottom = lastRect.top + lastRect.height / 2 - rect.top;
      setLine({ top, height: Math.max(0, bottom - top) });
    };

    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [data.length]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0%", "end 100%"],
  });

  const heightTransform = useTransform(
    scrollYProgress,
    [0, 1],
    [0, line.height],
  );
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const total = data.length;
    setActiveIndex(Math.min(Math.floor(latest * total), total - 1));
  });

  return (
    <div className="relative mt-3" ref={containerRef}>
      <div ref={ref} className="relative space-y-2">
        {data.map((item, index) => {
          const isActive = !dimmed && index <= activeIndex;

          return (
            <div key={index} data-timeline-item className="flex items-start">
              {/* Dot */}
              <div className="relative flex flex-col items-center pr-4">
                <div
                  data-timeline-dot
                  className="sticky top-24 z-10 flex items-center justify-center"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      isActive ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "size-3 rounded-full transition-colors duration-300",
                        isActive ? "bg-primary" : "bg-muted-foreground",
                      )}
                    />
                  </span>
                </div>
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pb-4">
                <Badge
                  className={cn(
                    "mb-2 h-6.5 rounded-sm text-sm font-medium transition-colors duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {item.title}
                </Badge>
                {item.content}
              </div>
            </div>
          );
        })}
        <div
          style={{ top: `${line.top}px`, height: `${line.height}px` }}
          className="bg-border absolute left-3 w-0.5 overflow-hidden"
          aria-hidden="true"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="bg-primary absolute inset-x-0 top-0 w-0.5 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
