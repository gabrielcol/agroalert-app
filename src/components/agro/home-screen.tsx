"use client";

import { useCallback, useState } from "react";

import { DashboardScreen } from "@/components/agro/dashboard-screen";
import { StartScreen } from "@/components/agro/start-screen";

/**
 * `/` in two beats: the mock start screen, then "Culturile tale". The splash
 * renders on the server too (`ready` starts false on both sides), so there is
 * nothing for hydration to disagree about. Deep links into `/plan/*` mount
 * their own screens and never see it.
 */
export function HomeScreen() {
  const [ready, setReady] = useState(false);
  const handleDone = useCallback(() => setReady(true), []);

  if (!ready) return <StartScreen onDone={handleDone} />;
  return <DashboardScreen />;
}
