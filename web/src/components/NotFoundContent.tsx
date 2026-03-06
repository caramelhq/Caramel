"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFoundContent() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#d77655]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <span className="text-[10rem] md:text-[14rem] font-display italic leading-none tracking-tight accent-gradient-text select-none">
            404
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-xl md:text-2xl font-semibold text-text-primary mb-3"
        >
          Page not found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="text-sm text-muted mb-10"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="flex items-center justify-center gap-3"
        >
          <button
            onClick={() => history.back()}
            className="group relative inline-flex items-center rounded-full text-sm"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 border border-stroke bg-bg text-text-primary group-hover:border-transparent transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Go back
            </span>
          </button>

          <Link
            href="/"
            className="group relative inline-flex items-center rounded-full text-sm"
          >
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors">
              <Home className="w-3.5 h-3.5" />
              Home
            </span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
