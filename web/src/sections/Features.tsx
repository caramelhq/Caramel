"use client";

import { motion } from "framer-motion";
import { Shield, Eye, VolumeOff, Blocks, type LucideIcon } from "lucide-react";

interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  preview: {
    label: string;
    lines: string[];
  };
  gradient: string;
}

const FEATURES: Feature[] = [
  {
    id: "moderation",
    icon: Shield,
    title: "Moderation",
    description:
      "Full suite of moderation tools — warn, mute, ban, softban, kick, timeout, slowmode, lockdown, and sanction history. Slash commands and prefix support.",
    preview: {
      label: "/mod ban",
      lines: [
        "Member banned successfully.",
        "Reason: Repeated rule violations",
        "Case #47 — logged to #mod-logs",
      ],
    },
    gradient: "from-[#d77655] via-[#e8a68e]/60 to-transparent",
  },
  {
    id: "vanity",
    icon: Eye,
    title: "Vanity Tracker",
    description:
      "Detects custom status keywords and automatically assigns or removes roles. Jobs processed asynchronously in the background — zero lag, zero missed updates.",
    preview: {
      label: "Status detected",
      lines: [
        "User @Mika updated status",
        'Keyword matched: "caramel.gg"',
        "Role assigned: Vanity Rep",
      ],
    },
    gradient: "from-violet-500 via-violet-400/60 to-transparent",
  },
  {
    id: "silentban",
    icon: VolumeOff,
    title: "Silent Ban",
    description:
      "Silently restrict users from sending messages or joining voice — without notifying them. Progressive rate-limit escalation keeps bad actors in the dark.",
    preview: {
      label: "/mod silentban add",
      lines: [
        "Silent ban applied to @User",
        "Messages: blocked",
        "Voice: restricted",
      ],
    },
    gradient: "from-red-500/80 via-red-400/50 to-transparent",
  },
  {
    id: "modules",
    icon: Blocks,
    title: "Module System",
    description:
      "Each feature is an independent module. Enable, disable, configure, or factory reset per guild — without affecting anything else. Total control.",
    preview: {
      label: "/module setup",
      lines: [
        "Module: Vanity Tracker",
        "Status: Enabled",
        "Config: keyword, role, channel",
      ],
    },
    gradient: "from-sky-500 via-blue-400/60 to-transparent",
  },
];

const SPANS = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function Features() {
  return (
    <section id="features" className="bg-bg py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 md:mb-16"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Features</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-medium text-text-primary mb-2">
                Built for{" "}
                <span className="font-display italic accent-gradient-text">serious</span>{" "}
                servers
              </h2>
              <p className="text-sm md:text-base text-muted max-w-md">
                Every tool you need to keep your community safe, organized, and running smoothly.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={cardVariants}
                className={`col-span-1 ${SPANS[i]} group`}
              >
                <div className="relative bg-surface border border-stroke rounded-3xl overflow-hidden p-6 md:p-8 h-full flex flex-col hover:border-[#d77655]/30 transition-colors duration-300">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`} />

                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-6 h-6 text-accent shrink-0" />
                    <h3 className="text-lg md:text-xl font-semibold text-text-primary">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-sm text-muted mb-6 flex-grow">{feature.description}</p>

                  <div className="bg-bg/60 rounded-2xl border border-stroke/50 p-4 font-mono">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-[#d77655]" />
                      <span className="text-xs font-medium text-accent">{feature.preview.label}</span>
                    </div>
                    {feature.preview.lines.map((line, j) => (
                      <p key={j} className="text-xs text-muted/80 leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
