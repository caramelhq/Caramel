"use client";

import { motion } from "framer-motion";

const STATS = [
  { number: "16+", label: "Mod Commands", sublabel: "From warn to lockdown, everything you need." },
  { number: "0ms", label: "Blocking Time", sublabel: "Async workers handle heavy tasks in the background." },
  { number: "100%", label: "Modular", sublabel: "Enable only what you need. Disable the rest." },
];

export default function Stats() {
  return (
    <section id="stats" className="bg-bg py-16 md:py-24">
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
            <span className="text-xs text-muted uppercase tracking-[0.3em]">By the Numbers</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-medium text-text-primary mb-2">
            Designed to be{" "}
            <span className="font-display italic accent-gradient-text">fast</span>
          </h2>
          <p className="text-sm md:text-base text-muted max-w-lg">
            No shortcuts. Every feature is built with performance and reliability in mind —
            from the cache layer to the job queue.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1],
                delay: i * 0.15,
              }}
              viewport={{ once: true, margin: "-50px" }}
              className={`${i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-medium tracking-tighter accent-gradient-text mb-4">
                {stat.number}
              </div>
              <div className="h-px bg-stroke mb-4" />
              <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-1">
                {stat.label}
              </h3>
              <p className="text-sm text-muted">{stat.sublabel}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
