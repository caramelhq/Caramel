"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/sections/Hero";
import Features from "@/sections/Features";
import AllInOne from "@/sections/AllInOne";
import Showcase from "@/sections/Showcase";
import Stats from "@/sections/Stats";
import Contact from "@/sections/Contact";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("hero");

  const handleComplete = useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    if (isLoading) return;

    const sections = ["hero", "features", "allinone", "showcase", "stats", "contact"];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3 }
    );

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [isLoading]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen onComplete={handleComplete} />}
      </AnimatePresence>

      {!isLoading && (
        <>
          <Navbar activeSection={activeSection} />
          <main>
            <Hero />
            <Features />
            <AllInOne />
            <Showcase />
            <Stats />
            <Contact />
          </main>
        </>
      )}
    </>
  );
}
