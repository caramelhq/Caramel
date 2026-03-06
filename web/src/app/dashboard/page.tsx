"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Users, Blocks, ChevronRight, Search, Loader2, Plus, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useApi } from "@/lib/api";
import { getBotInviteUrl } from "@/lib/invite";

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  modulesEnabled: number;
  modulesTotal: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const;

export default function ServerPicker() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const { data: guilds, loading, error } = useApi<Guild[]>("/api/guilds");

  const filtered = (guilds ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to site
        </Link>

        <div className="flex items-center gap-3">
          <img src="/caramel-logo.webp" alt="Caramel" className="w-7 h-7 rounded-full" />
          <span className="text-sm font-semibold text-foreground hidden sm:inline">Caramel</span>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <div className="flex items-center gap-2.5">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(session.user.name ?? "?").charAt(0)}
                </div>
              )}
              <span className="text-sm text-foreground hidden sm:inline">{session.user.name}</span>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-10 max-w-md"
        >
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Select a server
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a server to manage. You can switch between servers at any time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-xl mb-6 space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search servers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <a
            href={getBotInviteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Caramel to a server
          </a>
        </motion.div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your servers...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-sm text-red-400 mb-2">Failed to load servers</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-xl space-y-2"
          >
            {filtered.map((guild) => (
              <motion.div key={guild.id} variants={item}>
                <Link
                  href={`/dashboard/${guild.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all"
                >
                  {guild.icon ? (
                    <img
                      src={guild.icon}
                      alt={guild.name}
                      className="w-12 h-12 rounded-xl shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                      {guild.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{guild.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {guild.memberCount.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Blocks className="w-3 h-3" />
                        {guild.modulesEnabled}/{guild.modulesTotal} modules
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}

            {filtered.length === 0 && guilds && guilds.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted-foreground py-8"
              >
                No servers found matching &ldquo;{search}&rdquo;
              </motion.p>
            )}

            {guilds && guilds.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-sm text-muted-foreground mb-2">
                  No servers found
                </p>
                <p className="text-xs text-muted-foreground">
                  Make sure Caramel is added to a server where you have the Manage Server permission.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
