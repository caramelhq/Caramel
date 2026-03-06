"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";

const NAV_LINKS = ["Home", "Features", "Stats", "Docs"];

export default function Navbar({ activeSection }: { activeSection: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (id: string) => {
    if (id === "Docs") {
      window.location.href = "/docs";
      return;
    }
    const map: Record<string, string> = {
      Home: "hero",
      Features: "features",
      Stats: "stats",
    };
    const el = document.getElementById(map[id] || "hero");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
      <div
        className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-black/10" : ""
        }`}
      >
        <a
          href="#hero"
          className="group relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.preventDefault();
            handleNav("Home");
          }}
        >
          <span className="absolute inset-0 rounded-full accent-gradient transition-all group-hover:scale-110" />
          <span className="absolute inset-[2px] rounded-full bg-bg flex items-center justify-center">
            <img src="/caramel-logo.webp" alt="Caramel" className="w-5 h-5 rounded-full" />
          </span>
        </a>

        <span className="w-px h-5 bg-stroke mx-1 hidden sm:block" />

        {NAV_LINKS.map((link) => {
          const isActive =
            (link === "Home" && activeSection === "hero") ||
            (link === "Features" && (activeSection === "features" || activeSection === "allinone" || activeSection === "showcase")) ||
            (link === "Stats" && activeSection === "stats");
          return (
            <button
              key={link}
              onClick={() => handleNav(link)}
              className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-all duration-200 ${
                isActive
                  ? "text-text-primary bg-stroke/50"
                  : "text-muted hover:text-text-primary hover:bg-stroke/50"
              }`}
            >
              {link}
            </button>
          );
        })}

        <span className="w-px h-5 bg-stroke mx-1 hidden sm:block" />

        <a
          href="/login"
          className="group relative text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2"
        >
          <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-1.5 bg-surface rounded-full backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 -mx-3 sm:-mx-4 -my-1.5 sm:-my-2">
            <LogIn className="w-3.5 h-3.5 text-text-primary" />
            <span className="text-text-primary hidden sm:inline">Login</span>
          </span>
        </a>
      </div>
    </nav>
  );
}
