"use client";

import { motion } from "framer-motion";

const COMMANDS = [
  { name: "warn", desc: "Warn a member" },
  { name: "mute", desc: "Mute with role + duration" },
  { name: "timeout", desc: "Native Discord timeout" },
  { name: "unmute", desc: "Remove mute or timeout" },
  { name: "ban", desc: "Ban a member" },
  { name: "softban", desc: "Ban + unban to purge messages" },
  { name: "kick", desc: "Kick a member" },
  { name: "silentban", desc: "Add / remove / list" },
  { name: "slowmode", desc: "Set channel slowmode" },
  { name: "lockdown", desc: "Toggle channel lockdown" },
  { name: "history", desc: "View sanction history" },
  { name: "module setup", desc: "Interactive setup via modal" },
  { name: "module enable", desc: "Enable a module" },
  { name: "module disable", desc: "Disable a module" },
  { name: "module settings", desc: "View current config" },
  { name: "module reset", desc: "Factory reset a module" },
];

export default function AllInOne() {
  return (
    <section id="allinone" className="bg-bg py-16 md:py-24">
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
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Commands</span>
            <span className="w-8 h-px bg-stroke" />
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-text-primary mb-4">
            Slash or{" "}
            <span className="font-display italic accent-gradient-text">prefix</span>
            , your call
          </h2>
          <p className="text-sm md:text-base text-muted max-w-lg mx-auto">
            Every command works with both <span className="text-text-primary font-medium">/slash</span> and the <span className="text-text-primary font-medium font-mono">c!</span> prefix.
            Here&apos;s what Caramel can do.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {COMMANDS.map((cmd) => (
            <motion.div
              key={cmd.name}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className="group flex items-center gap-3 px-4 py-3 bg-surface/50 hover:bg-surface border border-stroke rounded-xl transition-all duration-200 hover:border-[#d77655]/30"
            >
              <span className="text-xs font-mono text-accent shrink-0 font-medium">/{cmd.name}</span>
              <span className="text-xs text-muted truncate">{cmd.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
