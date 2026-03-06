"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Blocks,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useApi } from "@/lib/api";

interface Stats {
  memberCount: number;
  modulesEnabled: number;
  modulesTotal: number;
  modActions7d: number;
  modActionsChange: number;
  activeMutes: number;
  activeSilentBans: number;
}

interface RecentAction {
  id: number;
  action: string;
  userId: string;
  userName: string | null;
  moderatorId: string;
  moderatorName: string | null;
  reason: string | null;
  duration: string | null;
  createdAt: string;
}

interface ModuleStatus {
  id: string;
  name: string;
  enabled: boolean;
  stats: { label: string; value: string }[];
}

interface ActivityDay {
  day: string;
  label: string;
  count: number;
}

const actionColors: Record<string, string> = {
  ban: "text-red-400 bg-red-400/10",
  mute: "text-yellow-400 bg-yellow-400/10",
  warn: "text-orange-400 bg-orange-400/10",
  kick: "text-rose-400 bg-rose-400/10",
  timeout: "text-amber-400 bg-amber-400/10",
  unmute: "text-emerald-400 bg-emerald-400/10",
  softban: "text-pink-400 bg-pink-400/10",
  silentban: "text-purple-400 bg-purple-400/10",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const;

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatUserId(id: string): string {
  if (id.length > 10) return `${id.slice(0, 6)}...${id.slice(-4)}`;
  return id;
}

export default function GuildOverview() {
  const { guildId } = useParams();
  const { data: stats, loading: statsLoading } = useApi<Stats>(`/api/guilds/${guildId}/stats`);
  const { data: actions, loading: actionsLoading } = useApi<RecentAction[]>(`/api/guilds/${guildId}/actions?limit=5`);
  const { data: modules, loading: modulesLoading } = useApi<ModuleStatus[]>(`/api/guilds/${guildId}/modules`);
  const { data: activity, loading: activityLoading } = useApi<ActivityDay[]>(`/api/guilds/${guildId}/activity`);

  const loading = statsLoading || actionsLoading || modulesLoading || activityLoading;

  const statCards = stats
    ? [
        {
          label: "Total Members",
          value: stats.memberCount.toLocaleString(),
          change: "",
          trend: "neutral" as const,
          icon: Users,
        },
        {
          label: "Active Modules",
          value: `${stats.modulesEnabled} / ${stats.modulesTotal}`,
          change: stats.modulesEnabled === stats.modulesTotal ? "All active" : `${stats.modulesTotal - stats.modulesEnabled} disabled`,
          trend: "neutral" as const,
          icon: Blocks,
        },
        {
          label: "Mod Actions (7d)",
          value: String(stats.modActions7d),
          change: stats.modActionsChange !== 0 ? `${stats.modActionsChange > 0 ? "+" : ""}${stats.modActionsChange}%` : "No change",
          trend: (stats.modActionsChange > 0 ? "up" : stats.modActionsChange < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
          icon: Shield,
        },
        {
          label: "Active Mutes",
          value: String(stats.activeMutes),
          change: `${stats.activeSilentBans} silent bans`,
          trend: "neutral" as const,
          icon: Activity,
        },
      ]
    : [];

  const maxActivity = activity ? Math.max(...activity.map((d) => d.count), 1) : 1;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Server dashboard
        </p>
      </motion.div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading dashboard data...
        </div>
      )}

      {stats && (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                <span className={`text-xs flex items-center gap-1 ${
                  stat.trend === "up" ? "text-emerald-400" : stat.trend === "down" ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {stat.trend === "up" && <TrendingUp className="w-3 h-3" />}
                  {stat.trend === "down" && <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 pb-0">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Actions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest moderation activity</p>
            </div>
            <a href={`/dashboard/${guildId}/logs`} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {actions && actions.length > 0 ? (
                actions.map((action) => (
                  <div key={action.id} className="flex items-center gap-3 rounded-lg bg-background/50 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase ${actionColors[action.action] ?? "text-muted-foreground bg-muted-foreground/10"}`}>
                      {action.action.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground capitalize">{action.action}</span>
                        <span className="text-xs text-muted-foreground">{action.userName ?? formatUserId(action.userId)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{action.reason || "No reason provided"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(action.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">by {action.moderatorName ?? formatUserId(action.moderatorId)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No recent actions</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-xl border border-border bg-card">
          <div className="p-5 pb-0">
            <h2 className="text-base font-semibold text-foreground">Modules</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Status overview</p>
          </div>
          <div className="p-5 space-y-3">
            {modules && modules.length > 0 ? (
              modules.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${mod.enabled ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                    <span className="text-sm text-foreground">{mod.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mod.enabled ? (
                      <span className="text-xs text-muted-foreground">{mod.stats[0]?.value ?? "Active"}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No modules configured</p>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Activity (7 days)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Moderation actions over the past week</p>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {activity ? (
            activity.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-md bg-primary/20 relative overflow-hidden"
                  style={{ height: `${(day.count / maxActivity) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-md"
                    style={{ height: "100%" }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
              </div>
            ))
          ) : (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-md bg-primary/5 h-0" />
                <span className="text-[10px] text-muted-foreground">-</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
