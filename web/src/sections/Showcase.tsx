"use client";

import { motion } from "framer-motion";
import { Zap, Database, Puzzle, type LucideIcon } from "lucide-react";

interface ArchLayer {
  icon: LucideIcon;
  title: string;
  description: string;
  tech: string;
}

const ARCH_LAYERS: ArchLayer[] = [
  {
    icon: Zap,
    title: "Async Job Processing",
    description: "Vanity checks, mute restores, and silent bans run as background workers via BullMQ — never blocking your commands.",
    tech: "BullMQ Workers",
  },
  {
    icon: Database,
    title: "Two-Layer Cache",
    description: "Redis-backed cache synced to PostgreSQL. Hot data stays fast, cold data stays safe. Every read hits cache first.",
    tech: "Redis + PostgreSQL",
  },
  {
    icon: Puzzle,
    title: "Independent Modules",
    description: "Each feature is fully isolated. Enable Vanity Tracker without touching Moderation. Reset one module without affecting others.",
    tech: "Per-guild config",
  },
];

const MODULE_DEMO = [
  { cmd: "/module setup name:Vanity Tracker", out: "Interactive setup modal opened" },
  { cmd: "/module enable name:Vanity Tracker", out: "Module enabled for this guild" },
  { cmd: "/module settings name:Moderation", out: "Prefix: c! · Log channel: #mod-logs · Mute role: @Muted" },
  { cmd: "/module reset name:Moderation", out: "Module reset to factory defaults" },
];

export default function Showcase() {
  return (
    <section id="showcase" className="bg-bg py-16 md:py-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Architecture</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-text-primary mb-4">
            Built to{" "}
            <span className="font-display italic accent-gradient-text">scale</span>
          </h2>
          <p className="text-sm md:text-base text-muted max-w-lg mx-auto">
            Clean architecture under the hood. Sapphire Framework, TypeScript, async workers,
            and a cache layer that keeps everything fast.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
            className="relative bg-surface border border-stroke rounded-3xl p-6 accent-glow"
          >
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-stroke">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-muted font-mono">module-system</span>
            </div>

            <div className="space-y-3">
              {MODULE_DEMO.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#d77655] font-mono font-bold select-none">$</span>
                    <span className="text-xs font-mono text-text-primary">{step.cmd}</span>
                  </div>
                  <p className="text-xs font-mono text-muted/70 pl-4">{step.out}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-stroke/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-mono text-muted">all modules operational</span>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            {ARCH_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.title}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.25, 0.1, 0.25, 1],
                    delay: i * 0.1,
                  }}
                  viewport={{ once: true }}
                  className="group flex items-start gap-4 p-5 bg-surface/30 hover:bg-surface border border-stroke rounded-2xl transition-all duration-300 hover:border-[#d77655]/30"
                >
                  <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base md:text-lg font-semibold text-text-primary">
                        {layer.title}
                      </h3>
                      <span className="text-[10px] font-mono text-muted bg-stroke/50 px-2 py-0.5 rounded-full hidden sm:block">
                        {layer.tech}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{layer.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
