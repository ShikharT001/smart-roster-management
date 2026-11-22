"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Calendar,
  Layers,
  Table,
  BarChart2,
  AlertOctagon,
  History,
  Sun,
  Moon,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMonth = searchParams.get("month") || "2026-11";
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const navItems = [
    { label: "Dashboard", href: `/?month=${currentMonth}`, active: pathname === "/", icon: BarChart2 },
    { label: "Roster Grid", href: `/roster?month=${currentMonth}`, active: pathname.startsWith("/roster"), icon: Table },
    { label: "Coverage Heatmap", href: `/coverage?month=${currentMonth}`, active: pathname.startsWith("/coverage"), icon: Calendar },
    { label: "Issues Panel", href: `/issues?month=${currentMonth}`, active: pathname.startsWith("/issues"), icon: AlertOctagon },
    { label: "Change Log", href: `/changelog?month=${currentMonth}`, active: pathname.startsWith("/changelog"), icon: History },
    { label: "Setup", href: `/setup?month=${currentMonth}`, active: pathname.startsWith("/setup"), icon: Layers },
  ];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
        {/* Brand identifier */}
        <div className="flex items-center gap-6">
          <Link href={`/?month=${currentMonth}`} className="flex items-center gap-2 font-semibold text-sm tracking-tight text-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" />
            <span>ROSTER OPS</span>
          </Link>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-border">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Month:
            </span>
            <select
              value={currentMonth}
              onChange={handleMonthChange}
              className="text-xs bg-surface-muted text-foreground font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
            >
              <option value="2026-10">October 2026</option>
              <option value="2026-11">November 2026 (Demo)</option>
              <option value="2026-12">December 2026</option>
              <option value="2027-01">January 2027</option>
            </select>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors select-none",
                  item.active
                    ? "bg-accent-subtle text-accent border border-accent/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-surface-hover border border-transparent"
                )}
              >
                <Icon size={14} className={item.active ? "text-accent" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded border border-border text-slate-500 hover:text-foreground hover:bg-surface-hover focus:outline-none"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
};
