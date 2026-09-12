"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder cards while a recommendation query is in flight. */
export function RecommendationSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="mt-5 flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[132px] w-full rounded-[var(--radius-lg)]" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The retry screen (ADR 0003): a failed Weather Brief or model call shows this
 * and nothing else — no partial or mock recommendation.
 */
export function RetryScreen({
  title,
  description,
  action,
  onRetry,
  retrying = false,
}: {
  title: string;
  description: string;
  action: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <Alert variant="destructive" className="mt-5" role="alert">
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-fit"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw className={retrying ? "animate-spin" : undefined} />
          {action}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
