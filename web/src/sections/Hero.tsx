"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import Hls from "hls.js";
import gsap from "gsap";
import GradientButton from "@/components/GradientButton";
import { getBotInviteUrl } from "@/lib/invite";

const HLS_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
const TRAITS = ["Modular", "Reliable", "Precise", "Adorable"];

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [traitIndex, setTraitIndex] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = HLS_SRC;
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTraitIndex((i) => (i + 1) % TRAITS.length), 2000);
    return () => clearInterval(iv);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".name-reveal",
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }
      );
      tl.fromTo(
        ".blur-in",
        { opacity: 0, filter: "blur(10px)", y: 20 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 },
        "-=0.6"
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="hero" ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#d77655]/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <p className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8">
          MAKE IT SIMPLE — MAKE IT PERFECT
        </p>

        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          <span className="accent-gradient-text">Caramel</span>
        </h1>

        <p className="blur-in text-sm md:text-base text-muted mb-3">
          A{" "}
          <span
            key={traitIndex}
            className="font-display italic text-text-primary animate-role-fade-in inline-block"
          >
            {TRAITS[traitIndex]}
          </span>{" "}
          Discord bot built to scale.
        </p>

        <p className="blur-in text-sm md:text-base text-muted max-w-lg mb-12">
          Moderation, vanity tracking, silent bans, and more — each feature is an independent
          module you enable on your terms. Clean architecture, no bloat.
        </p>

        <div className="blur-in inline-flex gap-4 flex-wrap justify-center">
          <GradientButton
            variant="solid"
            href={getBotInviteUrl()}
          >
            Add to Discord
          </GradientButton>
          <GradientButton
            variant="outline"
            onClick={() =>
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            See what it does
          </GradientButton>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">Scroll</span>
        <div className="relative w-px h-10 bg-stroke overflow-hidden">
          <div className="absolute w-full h-3 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
