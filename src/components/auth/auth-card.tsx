"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-8 flex items-center gap-2 text-primary lg:hidden">
        <TrendingUp className="h-6 w-6" />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          BetManager
        </span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      <div className="mt-8">{children}</div>
    </motion.div>
  );
}
