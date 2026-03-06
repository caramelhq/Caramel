"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { getBotInviteUrl } from "@/lib/invite";

const RESOURCES = [
  { label: "Support Server", href: "#" },
  { label: "Documentation", href: "/docs" },
  { label: "GitHub", href: "https://github.com/CaramelHQ/Caramel" },
];

const LEGAL = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
];

export default function Contact() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!marqueeRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1,
      });
    });

    return () => ctx.revert();
  }, []);

  const marqueeText = "MAKE IT SIMPLE • MAKE IT PERFECT • CARAMEL • ".repeat(8);

  return (
    <section id="contact" className="relative bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d77655]/5 to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="overflow-hidden mb-12 md:mb-16">
          <div ref={marqueeRef} className="whitespace-nowrap">
            <span className="text-5xl md:text-7xl lg:text-8xl font-display italic text-text-primary/10">
              {marqueeText}
            </span>
          </div>
        </div>

        <div className="text-center px-6 mb-16 md:mb-20">
          <p className="text-sm md:text-base text-muted max-w-md mx-auto mb-8">
            Ready to run a cleaner server? Add Caramel and set up your first module in seconds.
          </p>
          <motion.a
            href={getBotInviteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="group relative inline-flex items-center rounded-full"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative inline-flex items-center gap-3 px-8 py-4 bg-bg border-2 border-stroke rounded-full text-text-primary group-hover:border-transparent transition-colors">
              <span className="text-base font-medium">Add to Discord</span>
              <span className="text-lg">↗</span>
            </span>
          </motion.a>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="border-t border-stroke pt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img src="/caramel-logo.webp" alt="Caramel" className="w-5 h-5 rounded-full" />
                  <span className="text-lg font-semibold accent-gradient-text">Caramel</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  A modular Discord bot built with clean architecture. Make it simple — make it perfect.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Invite</h4>
                <div className="flex flex-col gap-2">
                  <a href={getBotInviteUrl()} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-text-primary transition-colors duration-200">
                    Add Bot
                  </a>
                  <a href="#" className="text-sm text-muted hover:text-text-primary transition-colors duration-200">
                    Support Server
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Resources</h4>
                <div className="flex flex-col gap-2">
                  {RESOURCES.map((r) => (
                    <a
                      key={r.label}
                      href={r.href}
                      className="text-sm text-muted hover:text-text-primary transition-colors duration-200"
                    >
                      {r.label}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Legal</h4>
                <div className="flex flex-col gap-2">
                  {LEGAL.map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      className="text-sm text-muted hover:text-text-primary transition-colors duration-200"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-stroke pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted">&copy; Caramel, 2026. MIT License.</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-sm text-muted">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
