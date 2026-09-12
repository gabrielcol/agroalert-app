import Link from "next/link";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { Brand } from "@/components/shared/brand";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ModeToggle } from "@/components/mode-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <AuthBrandPanel />
      <main className="relative flex items-center justify-center p-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <Link href="/" className="flex justify-center lg:hidden">
            <Brand imageClassName="h-10 w-auto" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
