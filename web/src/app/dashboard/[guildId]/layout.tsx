"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Blocks,
  ScrollText,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ChevronsUpDown,
  Check,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/api";

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  modulesEnabled: number;
  modulesTotal: number;
}

function getNavItems(guildId: string) {
  return [
    { title: "Overview", href: `/dashboard/${guildId}`, icon: LayoutDashboard },
    { title: "Modules", href: `/dashboard/${guildId}/modules`, icon: Blocks },
    { title: "Mod Logs", href: `/dashboard/${guildId}/logs`, icon: ScrollText },
    { title: "Settings", href: `/dashboard/${guildId}/settings`, icon: Settings },
  ];
}

function GuildAvatar({ guild, size = "md" }: { guild: Guild; size?: "sm" | "md" }) {
  const cls = size === "sm"
    ? "w-7 h-7 rounded-md text-xs"
    : "w-8 h-8 rounded-lg text-xs";

  if (guild.icon) {
    return <img src={guild.icon} alt={guild.name} className={`${cls} shrink-0`} />;
  }
  return (
    <div className={`${cls} bg-primary/15 flex items-center justify-center font-bold text-primary shrink-0`}>
      {guild.name.charAt(0)}
    </div>
  );
}

function ServerSwitcher({ currentGuildId, guilds }: { currentGuildId: string; guilds: Guild[] }) {
  const [open, setOpen] = useState(false);
  const current = guilds.find((g) => g.id === currentGuildId);

  return (
    <div className="px-3 mb-2 relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-lg bg-card border border-border px-3 py-2.5 w-full hover:bg-card/80 transition-colors"
      >
        {current ? (
          <GuildAvatar guild={current} />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground truncate">{current?.name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {current?.memberCount.toLocaleString() ?? 0} members
          </p>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-xl py-1 max-h-64 overflow-y-auto">
            {guilds.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/${g.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 hover:bg-background/50 transition-colors",
                  g.id === currentGuildId && "bg-primary/5"
                )}
              >
                <GuildAvatar guild={g} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g.memberCount.toLocaleString()} members</p>
                </div>
                {g.id === currentGuildId && <Check className="w-4 h-4 text-primary shrink-0" />}
              </Link>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
              >
                All servers
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  guildId,
  guilds,
  onNavClick,
}: {
  pathname: string;
  guildId: string;
  guilds: Guild[];
  onNavClick?: () => void;
}) {
  const navItems = getNavItems(guildId);

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/caramel-logo.webp" alt="Caramel" className="w-8 h-8 rounded-full" />
        <span className="text-base font-semibold text-foreground">Caramel</span>
      </div>

      <ServerSwitcher currentGuildId={guildId} guilds={guilds} />

      <nav className="flex-1 px-3 py-2 space-y-1">
        <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Management
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/dashboard/${guildId}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 mt-auto border-t border-border space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </>
  );
}

export default function GuildDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const guildId = params.guildId as string;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const { data: guilds, loading } = useApi<Guild[]>("/api/guilds");

  const currentGuild = guilds?.find((g) => g.id === guildId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border bg-sidebar">
        <SidebarContent pathname={pathname} guildId={guildId} guilds={guilds ?? []} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-sidebar flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              pathname={pathname}
              guildId={guildId}
              guilds={guilds ?? []}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 h-14 px-4 md:px-6 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {session?.user?.name?.charAt(0) ?? currentGuild?.name.charAt(0) ?? "U"}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
