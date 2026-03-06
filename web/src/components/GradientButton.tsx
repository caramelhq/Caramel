"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "outline";
  className?: string;
}

export default function GradientButton({
  children,
  href,
  onClick,
  variant = "solid",
  className = "",
}: Props) {
  const isSolid = variant === "solid";

  const inner = (
    <motion.span
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="group relative inline-flex items-center rounded-full text-sm cursor-pointer"
    >
      <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span
        className={`relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 transition-colors duration-300 ${
          isSolid
            ? "bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary"
            : "border-2 border-stroke bg-bg text-text-primary group-hover:border-transparent"
        } ${className}`}
      >
        {children}
      </span>
    </motion.span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }

  return (
    <button onClick={onClick} type="button">
      {inner}
    </button>
  );
}
