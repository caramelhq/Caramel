"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  VolumeOff,
  RefreshCw,
  ChevronRight,
  Settings,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useApi, apiPatch } from "@/lib/api";

interface ModuleData {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  stats: { label: string; value: string }[];
}

const MODULE_ICONS: Record<string, typeof Shield> = {
  moderation: Shield,
  "vanity-tracker": Eye,
  "silent-ban": VolumeOff,
  "auto-mute-restore": RefreshCw,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const;

export default function ModulesPage() {
  const { guildId } = useParams();
  const { data: modules, loading, refetch } = useApi<ModuleData[]>(`/api/guilds/${guildId}/modules`);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const toggleModule = async (moduleId: string, currentEnabled: boolean) => {
    setToggling(moduleId);
    try {
      await apiPatch(`/api/guilds/${guildId}/modules`, {
        moduleId,
        enabled: !currentEnabled,
      });
      await refetch();
    } catch {
      // silently fail — UI will show stale state
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading modules...
      </div>
    );
  }

  const moduleList = modules ?? [];
  const enabledCount = moduleList.filter((m) => m.enabled).length;
  const disabledCount = moduleList.filter((m) => !m.enabled).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold text-foreground">Modules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enable, disable, and configure modules for your server.
        </p>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{enabledCount} enabled</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <XCircle className="w-4 h-4" />
          <span>{disabledCount} disabled</span>
        </div>
      </motion.div>

      <div className="space-y-3">
        {moduleList.map((mod) => {
          const Icon = MODULE_ICONS[mod.id] ?? Shield;
          const isToggling = toggling === mod.id;

          return (
            <motion.div
              key={mod.id}
              variants={item}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  mod.enabled ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{mod.name}</h3>
                    {!mod.configured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isToggling && (mod.id === "moderation" || mod.id === "vanity-tracker")) {
                      toggleModule(mod.id, mod.enabled);
                    }
                  }}
                  disabled={isToggling || (mod.id !== "moderation" && mod.id !== "vanity-tracker")}
                  className="shrink-0 disabled:opacity-50"
                >
                  {isToggling ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : mod.enabled ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>

                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${
                  expandedId === mod.id ? "rotate-90" : ""
                }`} />
              </div>

              {expandedId === mod.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border"
                >
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {mod.stats.map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-background/50 px-4 py-3">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-semibold text-foreground mt-1">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/dashboard/${guildId}/settings`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Configure
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
