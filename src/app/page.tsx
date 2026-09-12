"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/brand";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import { useT } from "@/lib/i18n/provider";

export default function LandingPage() {
  const t = useT();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-8">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-balance">{t.landing.title}</h1>
          <p className="text-muted-foreground text-lg text-pretty">
            {t.landing.subtitle}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">
              {t.landing.cta}
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">{t.common.signIn}</Link>
          </Button>
        </div>

        <p className="text-muted-foreground mt-8 text-sm">{t.landing.note}</p>
      </main>
    </div>
  );
}
