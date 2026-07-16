"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { navItems } from "@/components/layout/nav-items";
import { useMe } from "@/hooks/use-me";

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data: me } = useMe();

  const items = navItems.filter(
    (item) => !item.adminOnly || me?.role === "ADMIN",
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" onClick={onNavigate} aria-label="AutistasTips">
          <Logo markClassName="h-7 w-7" wordmarkClassName="text-base" />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 scrollbar-thin">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <item.icon
                className={cn(
                  "relative z-10 h-4 w-4",
                  active && "text-primary",
                )}
              />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="truncate text-sm font-medium">{me?.name ?? "…"}</p>
        <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
      </div>
    </div>
  );
}
