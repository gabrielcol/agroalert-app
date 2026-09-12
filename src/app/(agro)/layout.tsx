import { PhoneShell } from "@/components/agro/phone-shell";

// Public AgroAlert screens: no session required. The signed-in admin area
// (/dashboard, /users, /audit, /settings) keeps its own guard under (admin).
export default function AgroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PhoneShell>{children}</PhoneShell>;
}
