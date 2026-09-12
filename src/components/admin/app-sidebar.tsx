"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  Settings,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Brand } from "@/components/shared/brand";
import { useT } from "@/lib/i18n/provider";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useT();

  const sections = [
    {
      label: t.nav.section.overview,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      label: t.nav.section.administration,
      items: [
        { href: "/users", label: t.nav.users, icon: UsersRound },
        { href: "/audit", label: t.nav.audit, icon: ScrollText },
        { href: "/settings", label: t.nav.settings, icon: Settings },
      ],
    },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3.5">
        <Link href="/dashboard">
          <Brand />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <p className="text-muted-foreground px-1 text-xs">
          {t.app.name} · v0.1
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
