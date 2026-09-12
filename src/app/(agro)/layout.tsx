import type { Viewport } from "next";

import { PhoneShell } from "@/components/agro/phone-shell";

// Public AgroAlert screens: no session required. The signed-in admin area
// (/dashboard, /users, /audit, /settings) keeps its own guard under (admin).
// Only the phone screens end in a bar that pads itself past the home indicator
// with `env(safe-area-inset-bottom)`, and that inset reports a real value only
// when the page opts into the full display. Scoped here rather than to the root
// layout: `viewport-fit=cover` also drops the browser's automatic side insets,
// which the admin and auth areas have no reason to take on.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function AgroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PhoneShell>{children}</PhoneShell>;
}
