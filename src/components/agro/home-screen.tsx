"use client";

import { useCallback, useState } from "react";

import { DashboardScreen } from "@/components/agro/dashboard-screen";
import { StartScreen } from "@/components/agro/start-screen";
import {
  markStartScreenSeen,
  useStartScreenSeen,
} from "@/lib/agro/start-screen-storage";

/**
 * `/` in two beats: the mock start screen, then "Culturile tale" — but only the
 * first time in a browser session (issue 0017). `useStartScreenSeen` reads a
 * `sessionStorage` flag through an external store whose server snapshot is
 * "not seen", so the server and the first client render produce the same markup
 * and React swaps in the real value during hydration; later visits to `/` in the
 * same tab session land on the dashboard. `handedOver` covers this mount (and
 * browsers where storage is unavailable, so the splash cannot loop). Deep links
 * into `/plan/*` mount their own screens and never see it.
 */
export function HomeScreen() {
  const seen = useStartScreenSeen();
  const [handedOver, setHandedOver] = useState(false);
  const handleDone = useCallback(() => {
    markStartScreenSeen();
    setHandedOver(true);
  }, []);

  if (!seen && !handedOver) return <StartScreen onDone={handleDone} />;
  return <DashboardScreen />;
}
