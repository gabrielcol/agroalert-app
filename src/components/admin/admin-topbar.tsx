"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { useT } from "@/lib/i18n/provider";

/** Two-letter uppercase initials from a display name (defensive). */
export function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return letters.toUpperCase() || "?";
}

/** Plain, serialisable slice of the session user passed down from the
 * server layout so the topbar's first paint (SSR and the client's initial
 * hydration render) already has real data — `authClient.useSession()` is
 * client-only and has nothing during SSR, so relying on it alone renders a
 * placeholder ("?", "…") server-side while the client (once its own session
 * fetch resolves) renders the real values, a hydration mismatch (issue 0013). */
export interface AdminTopbarUser {
  name: string;
  email: string;
  role: string | null;
}

export function AdminTopbar({ initialUser }: { initialUser: AdminTopbarUser }) {
  const t = useT();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  // `authClient.useSession()` still drives live updates (sign-out, a name
  // change) once mounted; `initialUser` is only the fallback for the very
  // first render, so server and client agree at hydration time.
  const user = session?.user ?? initialUser;
  const role =
    (session?.user as { role?: string | null } | undefined)?.role ??
    initialUser.role;

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-3 backdrop-blur sm:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="!h-5" />

      <div className="ml-auto flex items-center gap-1.5">
        <LanguageToggle />
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="focus-visible:ring-ring ml-1 rounded-full outline-none focus-visible:ring-2"
            aria-label={t.admin.topbar.account}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {user.email}
                </span>
                {role ? (
                  <span className="text-muted-foreground mt-1 text-xs font-normal">
                    {role}
                  </span>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut />
              {t.common.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
