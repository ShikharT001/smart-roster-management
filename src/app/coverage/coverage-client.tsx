"use client";

import React, { useState, useMemo } from "react";
import {
  EngineInput,
  RosterEntryData,
  ProcessData,
  EmployeeData,
} from "@/lib/engine/types";
import {
  getMonthDates,
  getDayOfWeek,
  formatHumanDate,
} from "@/lib/engine/date-utils";
import { requiredCoverage } from "@/lib/engine/coverage";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Filter, Search, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface CoverageClientProps {
  month: string;
  engineInput: EngineInput;
  entries: RosterEntryData[];
}

export const CoverageClient: React.FC<CoverageClientProps> = ({
  month,
  engineInput,
  entries,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GAPS" | "TIGHT" | "MET">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [inspectCell, setInspectCell] = useState<{
    isOpen: boolean;
    process: ProcessData | null;
    date: string;
    required: number;
    working: EmployeeData[];
    off: EmployeeData[];
    leaves: EmployeeData[];
  }>({
    isOpen: false,
    process: null,
    date: "",
    required: 0,
    working: [],
    off: [],
    leaves: [],
  });

  const monthDates = useMemo(() => getMonthDates(month), [month]);

  const brandMap = useMemo(
    () => new Map(engineInput.brands.map((b) => [b.id, b])),
    [engineInput.brands]
  );
  const empMap = useMemo(
    () => new Map(engineInput.employees.map((e) => [e.id, e])),
    [engineInput.employees]
  );

  // Index entries by employeeId -> date -> RosterEntryData
  const entryMap = useMemo(() => {
    const map = new Map<string, Map<string, RosterEntryData>>();
    for (const e of entries) {
      let m = map.get(e.employeeId);
      if (!m) {
        m = new Map();
        map.set(e.employeeId, m);
      }
      m.set(e.date, e);
    }
    return map;
  }, [entries]);

  // Pre-calculate coverage statistics per process per date
  const coverageData = useMemo(() => {
    return engineInput.processes.map((proc) => {
      const brand = brandMap.get(proc.brandId);
      const assigned = engineInput.assignments.filter((a) => a.processId === proc.id);
      const assignedEmps = assigned
        .map((a) => empMap.get(a.employeeId))
        .filter((e): e is EmployeeData => e !== undefined && e.active);

      let totalGaps = 0;
      let totalTight = 0;
      let totalMet = 0;

      const dayStats = monthDates.map((dateStr) => {
        const required = requiredCoverage(
          proc,
          dateStr,
          engineInput.holidays,
          engineInput.coverageOverrides
        );

        const workingEmps: EmployeeData[] = [];
        const offEmps: EmployeeData[] = [];
        const leaveEmps: EmployeeData[] = [];

        for (const emp of assignedEmps) {
          const entry = entryMap.get(emp.id)?.get(dateStr);
          if (entry && entry.status === "WORKING") {
            workingEmps.push(emp);
          } else if (entry && (entry.status === "LEAVE" || entry.status === "COMP_OFF")) {
            leaveEmps.push(emp);
          } else {
            offEmps.push(emp);
          }
        }

        let state: "CLOSED" | "GAP" | "TIGHT" | "MET" = "CLOSED";
        if (required > 0) {
          if (workingEmps.length < required) {
            state = "GAP";
            totalGaps++;
          } else if (workingEmps.length === required) {
            state = "TIGHT";
            totalTight++;
          } else {
            state = "MET";
            totalMet++;
          }
        }

        return {
          dateStr,
          required,
          workingCount: workingEmps.length,
          workingEmps,
          offEmps,
          leaveEmps,
          state,
        };
      });

      return {
        process: proc,
        brand,
        dayStats,
        totalGaps,
        totalTight,
        totalMet,
      };
    });
  }, [engineInput, brandMap, empMap, entryMap, monthDates]);

  // Filter processes
  const filteredCoverage = useMemo(() => {
    return coverageData.filter((item) => {
      if (selectedBrand !== "ALL" && item.process.brandId !== selectedBrand) {
        return false;
      }

      if (statusFilter === "GAPS" && item.totalGaps === 0) return false;
      if (statusFilter === "TIGHT" && item.totalTight === 0) return false;
      if (statusFilter === "MET" && item.totalMet === 0) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const brandName = item.brand?.name.toLowerCase() || "";
        const procType = item.process.type.toLowerCase();
        if (!brandName.includes(q) && !procType.includes(q)) return false;
      }

      return true;
    });
  }, [coverageData, selectedBrand, statusFilter, searchQuery]);

  const totalOverallGaps = coverageData.reduce((acc, c) => acc + c.totalGaps, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Overall Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 border border-border rounded-md shadow-sm">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Coverage Health Heatmap ({month})
          </h1>
          <p className="text-xs text-slate-500">
            Process requirement fulfillment: Met, Tight (no slack), and Unstaffed Gaps
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalOverallGaps > 0 ? (
            <Badge variant="error" size="md">
              <ShieldAlert size={12} className="mr-1 inline" />
              {totalOverallGaps} Coverage Gap Days
            </Badge>
          ) : (
            <Badge variant="success" size="md">
              <CheckCircle2 size={12} className="mr-1 inline" />
              100% Operating Coverage
            </Badge>
          )}
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3 border border-border rounded-md text-xs">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500 uppercase">Filters:</span>
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground focus:outline-none"
          >
            <option value="ALL">All Brands</option>
            {engineInput.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "GAPS" | "TIGHT" | "MET")}
            className="px-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground focus:outline-none"
          >
            <option value="ALL">All Coverage States</option>
            <option value="GAPS">Gaps Only (Needs Attention)</option>
            <option value="TIGHT">Tight Only (Exact Staffing)</option>
            <option value="MET">Surplus / Well-Covered</option>
          </select>

          <div className="relative">
            <Search size={13} className="absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search brand/process..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground placeholder:text-slate-400 focus:outline-none w-36 focus:w-48 transition-all"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] border-t lg:border-t-0 pt-2 lg:pt-0 border-border">
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800" />
            <span>Surplus (Working &gt; Min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 dark:bg-amber-950 dark:border-amber-800" />
            <span>Tight (Working = Min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 dark:bg-rose-950 dark:border-rose-800" />
            <span>Gap (Working &lt; Min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700" />
            <span>Closed / 0 Req</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="border border-border rounded-md bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-surface-muted border-b border-border select-none">
              <tr>
                <th className="sticky left-0 z-30 bg-surface-muted px-3 py-2 text-left font-semibold text-foreground border-r border-border min-w-[220px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  Brand / Process
                </th>
                {monthDates.map((dateStr) => {
                  const dayNum = dateStr.slice(-2);
                  const dow = getDayOfWeek(dateStr);
                  const isWeekend = dow === 0 || dow === 6;
                  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

                  return (
                    <th
                      key={dateStr}
                      className={`px-1.5 py-1.5 text-center border-r border-border min-w-[34px] ${
                        isWeekend ? "bg-slate-200/50 dark:bg-slate-800/40" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 font-normal">
                          {DAY_LETTERS[dow]}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-foreground">
                          {dayNum}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filteredCoverage.length === 0 ? (
                <tr>
                  <td colSpan={monthDates.length + 1} className="px-4 py-8 text-center text-slate-400">
                    No processes match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCoverage.map((item) => {
                  return (
                    <tr key={item.process.id} className="hover:bg-surface-hover/40 transition-colors">
                      {/* Sticky Process Info Column */}
                      <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 border-r border-border font-medium text-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                            {item.brand?.name}
                          </span>
                          {item.totalGaps > 0 && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold tabular-nums">
                              {item.totalGaps} gap(s)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="truncate">{item.process.type}</span>
                          <span className="tabular-nums">min: {item.process.minStaffDefault}</span>
                        </div>
                      </td>

                      {/* Day Heatmap Cells */}
                      {item.dayStats.map((stat) => {
                        let bgClass = "bg-slate-50 text-slate-400 border-slate-200/50 dark:bg-slate-900/40 dark:text-slate-600 dark:border-slate-800";
                        let cellText = "-";

                        if (stat.state === "GAP") {
                          bgClass = "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 font-bold";
                          cellText = `${stat.workingCount}/${stat.required}`;
                        } else if (stat.state === "TIGHT") {
                          bgClass = "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800";
                          cellText = `${stat.workingCount}/${stat.required}`;
                        } else if (stat.state === "MET") {
                          bgClass = "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800";
                          cellText = `${stat.workingCount}/${stat.required}`;
                        }

                        return (
                          <td
                            key={stat.dateStr}
                            onClick={() =>
                              setInspectCell({
                                isOpen: true,
                                process: item.process,
                                date: stat.dateStr,
                                required: stat.required,
                                working: stat.workingEmps,
                                off: stat.offEmps,
                                leaves: stat.leaveEmps,
                              })
                            }
                            className="p-0.5 border-r border-border text-center cursor-pointer select-none"
                            title={`${item.brand?.name} / ${item.process.type} on ${stat.dateStr}: Required ${stat.required}, Working ${stat.workingCount}`}
                          >
                            <div
                              className={`h-7 rounded flex items-center justify-center font-medium text-[10px] border transition-transform hover:scale-[1.03] tabular-nums ${bgClass}`}
                            >
                              <span>{cellText}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT CELL MODAL */}
      <Modal
        isOpen={inspectCell.isOpen}
        onClose={() => setInspectCell((prev) => ({ ...prev, isOpen: false }))}
        title="Coverage Details"
        maxWidth="md"
        footer={
          <button
            onClick={() => setInspectCell((prev) => ({ ...prev, isOpen: false }))}
            className="px-3 py-1.5 text-xs font-medium rounded bg-surface border border-border text-foreground hover:bg-surface-hover"
          >
            Close
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="p-3 bg-surface-muted border border-border rounded flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">
                {brandMap.get(inspectCell.process?.brandId || "")?.name}
              </span>
              <span className="font-mono text-slate-500">
                {formatHumanDate(inspectCell.date || "2026-11-01")}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>{inspectCell.process?.type}</span>
              <Badge variant="default" size="sm">
                Rule: {inspectCell.process?.calendarRule}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 bg-surface-muted border border-border rounded">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                Required Headcount
              </span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {inspectCell.required}
              </span>
            </div>
            <div
              className={`p-2.5 border rounded ${
                inspectCell.working.length < inspectCell.required
                  ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase block">
                Working Headcount
              </span>
              <span className="text-xl font-bold tabular-nums">
                {inspectCell.working.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1 text-xs">
            <div>
              <span className="font-semibold text-foreground block mb-1">
                Scheduled Working ({inspectCell.working.length}):
              </span>
              {inspectCell.working.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inspectCell.working.map((e) => (
                    <Badge key={e.id} variant="success" size="sm">
                      {e.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 text-xs">None scheduled</span>
              )}
            </div>

            {inspectCell.leaves.length > 0 && (
              <div>
                <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                  On Approved Leave / Comp-Off ({inspectCell.leaves.length}):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inspectCell.leaves.map((e) => (
                    <Badge key={e.id} variant="warning" size="sm">
                      {e.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {inspectCell.off.length > 0 && (
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Assigned but Off Today ({inspectCell.off.length}):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {inspectCell.off.map((e) => (
                    <Badge key={e.id} variant="neutral" size="sm">
                      {e.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
