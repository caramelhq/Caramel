"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Shield, Server, ChevronRight } from "lucide-react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleLogin = () => {
    signIn("discord", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-10 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex mb-6"
            >
              <div className="relative">
                <div className="absolute -inset-2 rounded-full accent-gradient opacity-20 blur-lg" />
                <img
                  src="/caramel-logo.webp"
                  alt="Caramel"
                  className="relative w-16 h-16 rounded-full border-2 border-stroke"
                />
              </div>
            </motion.div>

            <h1 className="text-2xl md:text-3xl font-semibold text-text-primary mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-muted">
              Sign in with Discord to manage your servers.
            </p>
          </div>

          <motion.button
            onClick={handleLogin}
            disabled={status === "loading"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-sm transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            {status === "loading" ? "Loading..." : "Continue with Discord"}
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-8 space-y-3"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stroke/50 bg-surface/30">
              <Shield className="w-4 h-4 text-accent shrink-0" />
              <div className="flex-grow">
                <p className="text-xs text-text-primary font-medium">Manage moderation</p>
                <p className="text-[11px] text-muted">Configure modules, view logs and history</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stroke" />
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stroke/50 bg-surface/30">
              <Server className="w-4 h-4 text-accent shrink-0" />
              <div className="flex-grow">
                <p className="text-xs text-text-primary font-medium">Server dashboard</p>
                <p className="text-[11px] text-muted">Toggle modules and adjust settings per guild</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stroke" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-center text-[11px] text-muted mt-8"
          >
            By logging in you agree to our{" "}
            <a href="#" className="text-accent hover:underline">Terms</a>
            {" "}and{" "}
            <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
