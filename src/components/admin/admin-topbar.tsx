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
function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return letters.toUpperCase() || "?";
}

export function AdminTopbar() {
  const t = useT();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const role = (user as { role?: string | null } | undefined)?.role ?? null;

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
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="truncate font-medium">
                  {user?.name ?? "…"}
                </span>
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {user?.email ?? ""}
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
