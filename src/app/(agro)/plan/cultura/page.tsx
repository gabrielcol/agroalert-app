import { Suspense } from "react";

import { CulturaScreen } from "@/components/agro/cultura-screen";

// The screen reads `?profile=` with useSearchParams, which needs a Suspense
// boundary so the rest of the route can still be prerendered.
export default function CulturaPage() {
  return (
    <Suspense>
      <CulturaScreen />
    </Suspense>
  );
}
