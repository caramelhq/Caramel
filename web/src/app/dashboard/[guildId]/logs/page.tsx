"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Ban,
  Clock,
  MessageSquareOff,
  UserMinus,
  VolumeOff,
  ShieldAlert,
  Lock,
  Timer,
  Loader2,
  X,
  Copy,
  Check,
} from "lucide-react";

interface LogEntry {
  id: number;
  action: string;
  targetId: string;
  targetName: string | null;
  moderatorId: string;
  moderatorName: string | null;
  reason: string;
  timestamp: string;
  duration?: string | null;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_META: Record<string, { icon: typeof Ban; color: string; bg: string }> = {
  ban: { icon: Ban, color: "text-red-400", bg: "bg-red-400/10" },
  mute: { icon: VolumeOff, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  warn: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-400/10" },
  kick: { icon: UserMinus, color: "text-rose-400", bg: "bg-rose-400/10" },
  timeout: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
  unmute: { icon: VolumeOff, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  softban: { icon: Ban, color: "text-pink-400", bg: "bg-pink-400/10" },
  silentban: { icon: MessageSquareOff, color: "text-purple-400", bg: "bg-purple-400/10" },
  lockdown: { icon: Lock, color: "text-blue-400", bg: "bg-blue-400/10" },
  slowmode: { icon: Timer, color: "text-cyan-400", bg: "bg-cyan-400/10" },
};

const ACTIONS = ["all", "ban", "mute", "warn", "kick", "timeout", "silentban", "softban", "unmute", "lockdown", "slowmode"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function LogsPage() {
  const { guildId } = useParams();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "8" });
      if (filterAction !== "all") params.set("action", filterAction);
      if (search) params.set("search", search);

      const res = await fetch(`/api/guilds/${guildId}/logs?${params}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [guildId, page, filterAction, search]);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchLogs();
      return;
    }
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {}, 300);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold text-foreground">Mod Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete history of moderation actions on your server.
        </p>
      </motion.div>

      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user ID, mod ID, or reason..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-card/80 transition-colors"
          >
            <Filter className="w-4 h-4 text-muted-foreground" />
            {filterAction === "all" ? "All actions" : filterAction}
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <div className="absolute top-full mt-1 left-0 z-10 w-44 rounded-lg border border-border bg-card shadow-lg py-1">
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setFilterAction(a); setFilterOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-background/50 transition-colors capitalize ${
                    filterAction === a ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {a === "all" ? "All actions" : a}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </motion.div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Action</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Target</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Moderator</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Reason</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Duration</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const meta = ACTION_META[log.action] || { icon: ShieldAlert, color: "text-muted-foreground", bg: "bg-muted-foreground/10" };
                const Icon = meta.icon;
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-border/50 last:border-0 hover:bg-background/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${meta.bg}`}>
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>
                        <span className={`text-sm font-medium capitalize ${meta.color}`}>{log.action}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{log.targetName ?? log.targetId}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{log.moderatorName ?? log.moderatorId}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground hidden lg:table-cell max-w-xs truncate">{log.reason || "No reason"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{log.duration || "\u2014"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * 8 + 1}&ndash;{Math.min(page * 8, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-background/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                      p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md hover:bg-background/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
      {selectedLog && (() => {
        const meta = ACTION_META[selectedLog.action] || { icon: ShieldAlert, color: "text-muted-foreground", bg: "bg-muted-foreground/10" };
        const Icon = meta.icon;

        const DetailRow = ({ label, value, copyKey }: { label: string; value: string; copyKey?: string }) => (
          <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground font-mono">{value}</span>
              {copyKey && (
                <button
                  onClick={() => copyToClipboard(value, copyKey)}
                  className="p-1 rounded hover:bg-background/50 transition-colors"
                >
                  {copiedField === copyKey
                    ? <Check className="w-3 h-3 text-emerald-400" />
                    : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              )}
            </div>
          </div>
        );

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground capitalize">{selectedLog.action}</h3>
                    <p className="text-xs text-muted-foreground">Log #{selectedLog.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-0">
                <DetailRow label="Target" value={selectedLog.targetName ?? "Unknown"} />
                <DetailRow label="Target ID" value={selectedLog.targetId} copyKey="targetId" />
                <DetailRow label="Moderator" value={selectedLog.moderatorName ?? "Unknown"} />
                <DetailRow label="Moderator ID" value={selectedLog.moderatorId} copyKey="modId" />
                <DetailRow label="Action" value={selectedLog.action} />
                {selectedLog.duration && (
                  <DetailRow label="Duration" value={selectedLog.duration} />
                )}
                <DetailRow label="Time" value={formatTimestamp(selectedLog.timestamp)} />
              </div>

              {selectedLog.reason && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-1.5">Reason</p>
                  <div className="rounded-lg bg-background/50 px-3 py-2.5">
                    <p className="text-sm text-foreground">{selectedLog.reason}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        );
      })()}
    </motion.div>
  );
}
