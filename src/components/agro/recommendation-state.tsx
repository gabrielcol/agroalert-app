"use client";

import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Placeholder cards while a recommendation query is in flight.
 *
 * `message` adds the spinner + status line the loading screen uses (issue
 * 0022), for a step whose model call is the only thing on screen — without it
 * a ~20 s wait reads as a broken screen. Opt-in: the crops step already
 * explains itself on the previous screen, so it keeps the bare cards.
 */
export function RecommendationSkeleton({
  count = 3,
  message,
}: {
  count?: number;
  message?: string;
}) {
  return (
    <>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className="text-subtle mt-5 flex items-center gap-2.5 text-[15.5px]"
        >
          <LoaderCircle
            className="text-brand size-[18px] shrink-0 animate-spin [animation-duration:2.2s]"
            aria-hidden="true"
          />
          {message}
        </p>
      )}
      <ul
        className={cn("flex flex-col gap-3", message ? "mt-3" : "mt-5")}
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-[132px] w-full rounded-[var(--radius-lg)]" />
          </li>
        ))}
      </ul>
    </>
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
