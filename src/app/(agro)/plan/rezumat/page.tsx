import { Suspense } from "react";

import { RezumatScreen } from "@/components/agro/rezumat-screen";

// The screen reads the wizard params with useSearchParams, which needs a
// Suspense boundary so the rest of the route can still be prerendered.
export default function RezumatPage() {
  return (
    <Suspense>
      <RezumatScreen />
    </Suspense>
  );
}
