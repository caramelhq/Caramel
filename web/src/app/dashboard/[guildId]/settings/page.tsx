"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Hash,
  Bell,
  Globe,
  Shield,
  Save,
  RotateCcw,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react";
import { useApi, apiPatch } from "@/lib/api";

interface Channel {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

interface SettingsData {
  config: {
    modLogChannelId: string | null;
    modModule: boolean;
    modThresholdsEnabled: boolean;
    mutedRoleId: string | null;
    muteThreshold: number;
    banThreshold: number;
    vanityModule: boolean;
    vanityString: string | null;
    vanityRoleId: string | null;
    vanityChannelId: string | null;
  } | null;
  channels: Channel[];
  roles: Role[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const;

export default function SettingsPage() {
  const { guildId } = useParams();
  const { data, loading, refetch } = useApi<SettingsData>(`/api/guilds/${guildId}/settings`);

  const [modLogChannelId, setModLogChannelId] = useState("");
  const [thresholdsEnabled, setThresholdsEnabled] = useState(false);
  const [muteThreshold, setMuteThreshold] = useState(3);
  const [banThreshold, setBanThreshold] = useState(5);
  const [mutedRoleId, setMutedRoleId] = useState("");
  const [vanityString, setVanityString] = useState("");
  const [vanityRoleId, setVanityRoleId] = useState("");
  const [vanityChannelId, setVanityChannelId] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.config) {
      setModLogChannelId(data.config.modLogChannelId ?? "");
      setThresholdsEnabled(data.config.modThresholdsEnabled);
      setMuteThreshold(data.config.muteThreshold);
      setBanThreshold(data.config.banThreshold);
      setMutedRoleId(data.config.mutedRoleId ?? "");
      setVanityString(data.config.vanityString ?? "");
      setVanityRoleId(data.config.vanityRoleId ?? "");
      setVanityChannelId(data.config.vanityChannelId ?? "");
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/guilds/${guildId}/settings`, {
        modLogChannelId: modLogChannelId || null,
        modThresholdsEnabled: thresholdsEnabled,
        muteThreshold,
        banThreshold,
        mutedRoleId: mutedRoleId || null,
        vanityString: vanityString || null,
        vanityRoleId: vanityRoleId || null,
        vanityChannelId: vanityChannelId || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refetch();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (data?.config) {
      setModLogChannelId(data.config.modLogChannelId ?? "");
      setThresholdsEnabled(data.config.modThresholdsEnabled);
      setMuteThreshold(data.config.muteThreshold);
      setBanThreshold(data.config.banThreshold);
      setMutedRoleId(data.config.mutedRoleId ?? "");
      setVanityString(data.config.vanityString ?? "");
      setVanityRoleId(data.config.vanityRoleId ?? "");
      setVanityChannelId(data.config.vanityChannelId ?? "");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

  const channels = data?.channels ?? [];
  const roles = data?.roles ?? [];

  const resolveRole = (id: string | null | undefined) =>
    roles.find((r) => r.id === id)?.name ?? null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Caramel for your server.
        </p>
      </motion.div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Moderation</h2>
            <p className="text-xs text-muted-foreground">Log channel, thresholds, and escalation</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Log Channel</label>
            <div className="relative w-full max-w-xs">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={modLogChannelId}
                onChange={(e) => setModLogChannelId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="">Select a channel</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">All moderation actions will be logged here.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Muted Role</label>
            <div className="relative w-full max-w-xs">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={mutedRoleId}
                onChange={(e) => setMutedRoleId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Role assigned to muted members.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Auto-escalation thresholds</p>
              <p className="text-xs text-muted-foreground">Auto-mute/ban after reaching warn count</p>
            </div>
            <button
              onClick={() => setThresholdsEnabled(!thresholdsEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                thresholdsEnabled ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                thresholdsEnabled ? "left-[22px]" : "left-0.5"
              }`} />
            </button>
          </div>

          {thresholdsEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mute threshold (warns)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={muteThreshold}
                  onChange={(e) => setMuteThreshold(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ban threshold (warns)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={banThreshold}
                  onChange={(e) => setBanThreshold(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Vanity Tracker</h2>
            <p className="text-xs text-muted-foreground">Status keyword and notification channel</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vanity Keyword</label>
            <input
              type="text"
              value={vanityString}
              onChange={(e) => setVanityString(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. /caramel"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Users with this keyword in their status get the vanity role.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vanity Role</label>
            <div className="relative w-full max-w-xs">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={vanityRoleId}
                onChange={(e) => setVanityRoleId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Role assigned to users with the vanity keyword in their status.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vanity Log Channel</label>
            <div className="relative w-full max-w-xs">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={vanityChannelId}
                onChange={(e) => setVanityChannelId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="">Select a channel</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Info</h2>
            <p className="text-xs text-muted-foreground">Current configuration status</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground">Moderation module</span>
            <span className={data?.config?.modModule ? "text-emerald-400" : "text-muted-foreground"}>
              {data?.config?.modModule ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground">Vanity module</span>
            <span className={data?.config?.vanityModule ? "text-emerald-400" : "text-muted-foreground"}>
              {data?.config?.vanityModule ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground">Muted role</span>
            <span className="text-muted-foreground text-xs">
              {resolveRole(data?.config?.mutedRoleId)
                ? `@${resolveRole(data?.config?.mutedRoleId)}`
                : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-muted-foreground">Vanity role</span>
            <span className="text-muted-foreground text-xs">
              {resolveRole(data?.config?.vanityRoleId)
                ? `@${resolveRole(data?.config?.vanityRoleId)}`
                : "Not set"}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </motion.div>

      <motion.div variants={item} className="rounded-xl border border-border/50 bg-card/50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Need help?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Check the documentation for detailed configuration guides.</p>
          </div>
          <a
            href="/docs"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Documentation <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
