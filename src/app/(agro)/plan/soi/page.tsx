import { Suspense } from "react";

import { SoiScreen } from "@/components/agro/soi-screen";

// The screen reads the wizard params with useSearchParams, which needs a
// Suspense boundary so the rest of the route can still be prerendered.
export default function SoiPage() {
  return (
    <Suspense>
      <SoiScreen />
    </Suspense>
  );
}
