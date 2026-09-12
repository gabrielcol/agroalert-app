import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n/provider";
import { TRPCReactProvider } from "@/trpc/client";
import { cn } from "@/lib/utils";

// latin-ext covers Central/Eastern European diacritics (e.g. ă â î ș ț).
const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AgroAlert",
  description: "Planuri de semănat și alerte meteo pentru culturile tale.",
};

// The phone screens end in a bar stuck to the bottom of the viewport, which
// pads itself past the home indicator with `env(safe-area-inset-bottom)`. That
// inset only reports a real value when the page opts into the full display.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <TooltipProvider delayDuration={200}>
              <TRPCReactProvider>{children}</TRPCReactProvider>
            </TooltipProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
