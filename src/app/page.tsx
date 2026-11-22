import React, { Suspense } from "react";
import Link from "next/link";
import { getEngineInputForMonth, getRosterByMonth } from "@/lib/db/queries";
import { checkFeasibility, validateRoster } from "@/lib/engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  GitBranch,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const month = params.month || "2026-11";

  const engineInput = await getEngineInputForMonth(month);
  const existingRoster = await getRosterByMonth(month);

  // If roster exists, run validator on entries; otherwise check feasibility structural issues
  const issues = existingRoster && engineInput.existingEntries && engineInput.existingEntries.length > 0
    ? validateRoster(engineInput, engineInput.existingEntries)
    : checkFeasibility(engineInput);

  const errorCount = issues.filter((i) => i.severity === "ERROR").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = issues.filter((i) => i.severity === "INFO").length;

  const totalEmployees = engineInput.employees.length;
  const activeEmployees = engineInput.employees.filter((e) => e.active).length;
  const totalBrands = engineInput.brands.length;
  const totalProcesses = engineInput.processes.length;
  const processes365 = engineInput.processes.filter((p) => p.calendarRule === "ALL_365").length;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Operations Roster Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time coverage health, constraints monitoring and staffing feasibility for {month}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/setup?month=${month}`}>
            <Button variant="secondary" size="sm">
              Configuration Setup
            </Button>
          </Link>
          <Link href={`/roster?month=${month}`}>
            <Button variant="primary" size="sm">
              Open Roster Grid <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Staff Headcount</span>
            <Users size={15} />
          </div>
          <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {activeEmployees}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {totalEmployees} active</span>
          </span>
          <span className="text-[11px] text-slate-500">{engineInput.pods.length} operational pods</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Brands Serviced</span>
            <Briefcase size={15} />
          </div>
          <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {totalBrands}
          </span>
          <span className="text-[11px] text-slate-500">19 single-resource, 5 shared</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Active Processes</span>
            <GitBranch size={15} />
          </div>
          <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {totalProcesses}
          </span>
          <span className="text-[11px] text-slate-500">{processes365} on 365-day schedule</span>
        </div>

        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Roster Status</span>
            <Calendar size={15} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={existingRoster?.status === "PUBLISHED" ? "success" : "warning"} size="md">
              {existingRoster ? existingRoster.status : "UNGENERATED DRAFT"}
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500">
            {existingRoster ? `Version ${existingRoster.version}` : "Baseline Feasibility Check"}
          </span>
        </div>
      </div>

      {/* Issues & Integrity Warning Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Coverage Health Card */}
        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Coverage Health
            </h2>
            {errorCount === 0 ? (
              <Badge variant="success" size="sm">
                Coverage Met
              </Badge>
            ) : (
              <Badge variant="error" size="sm">
                Attention Required
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3 py-1">
            <div
              className={`p-2 rounded flex-shrink-0 ${
                errorCount > 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              {errorCount > 0 ? <ShieldAlert size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {errorCount > 0
                  ? `${errorCount} Unresolved Operational Issues`
                  : "All Core Constraints Met"}
              </span>
              <p className="text-xs text-slate-500">
                {errorCount > 0
                  ? "Structural deficits or unstaffed operating days detected. System will never silently publish an invalid roster."
                  : "Deterministic availability matches configured min-staff targets across all processes."}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-slate-500">Active public holidays:</span>
            <span className="font-semibold text-foreground tabular-nums">
              {engineInput.holidays.length}
            </span>
          </div>
        </div>

        {/* Issue Breakdown Summary */}
        <div className="p-4 bg-surface border border-border rounded-md flex flex-col gap-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Constraint & Anomaly Breakdown
            </h2>
            <Link href={`/issues?month=${month}`} className="text-xs text-accent hover:underline font-medium">
              View Detailed Issues ({issues.length})
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="p-3 bg-surface-muted border border-border rounded flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {errorCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Errors
              </span>
            </div>
            <div className="p-3 bg-surface-muted border border-border rounded flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {warningCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Warnings
              </span>
            </div>
            <div className="p-3 bg-surface-muted border border-border rounded flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {infoCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Info / Prefs
              </span>
            </div>
          </div>

          {issues.length > 0 ? (
            <div className="mt-1 space-y-1.5">
              {issues.slice(0, 2).map((iss) => (
                <div
                  key={iss.id}
                  className="px-2.5 py-1.5 bg-surface-muted border border-border rounded text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Badge variant={iss.severity === "ERROR" ? "error" : "warning"} size="sm">
                      {iss.type}
                    </Badge>
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      {iss.message}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">
                    {iss.date || "Structural"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-2">No active anomalies detected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
