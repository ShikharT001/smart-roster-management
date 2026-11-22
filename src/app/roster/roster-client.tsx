"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  RosterEntryData,
  EngineInput,
  Issue,
  EntryStatus,
  EmployeeData,
} from "@/lib/engine/types";
import {
  generateRosterAction,
  updateRosterCellAction,
  publishRosterAction,
} from "@/lib/actions/roster";
import { getMonthDates, getDayOfWeek, formatHumanDate } from "@/lib/engine/date-utils";
import { generateRosterCsv } from "@/lib/export/csv";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Sparkles,
  RefreshCw,
  Send,
  Download,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";

interface RosterClientProps {
  month: string;
  initialRoster: {
    id: string;
    month: string;
    status: string;
    version: number;
    generatedAt: string;
  } | null;
  initialEntries: RosterEntryData[];
  initialIssues: Issue[];
  engineInput: EngineInput;
}

export const RosterClient: React.FC<RosterClientProps> = ({
  month,
  initialRoster,
  initialEntries,
  initialIssues,
  engineInput,
}) => {
  const [entries, setEntries] = useState<RosterEntryData[]>(initialEntries);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [roster, setRoster] = useState(initialRoster);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedPod, setSelectedPod] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedProcess, setSelectedProcess] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cell Editor Modal state
  const [cellModal, setCellModal] = useState<{
    isOpen: boolean;
    employee: EmployeeData | null;
    date: string;
    currentStatus: EntryStatus;
    locked: boolean;
    isManual: boolean;
    diffInfo: { before: number; after: number } | null;
  }>({
    isOpen: false,
    employee: null,
    date: "",
    currentStatus: "WORKING",
    locked: false,
    isManual: false,
    diffInfo: null,
  });

  // Publish Modal state
  const [publishModal, setPublishModal] = useState<{
    isOpen: boolean;
    acknowledge: boolean;
    errorCount: number;
  }>({
    isOpen: false,
    acknowledge: false,
    errorCount: 0,
  });

  const monthDates = useMemo(() => getMonthDates(month), [month]);

  // Index entries by employeeId -> date -> entry
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

  // Lookups
  const podMap = useMemo(
    () => new Map(engineInput.pods.map((p) => [p.id, p])),
    [engineInput.pods]
  );
  const brandMap = useMemo(
    () => new Map(engineInput.brands.map((b) => [b.id, b])),
    [engineInput.brands]
  );
  const procMap = useMemo(
    () => new Map(engineInput.processes.map((p) => [p.id, p])),
    [engineInput.processes]
  );

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return engineInput.employees.filter((emp) => {
      if (selectedPod !== "ALL" && emp.podId !== selectedPod) return false;

      const empAssignments = engineInput.assignments.filter((a) => a.employeeId === emp.id);

      if (selectedBrand !== "ALL") {
        const belongsToBrand = empAssignments.some((a) => {
          const proc = procMap.get(a.processId);
          return proc && proc.brandId === selectedBrand;
        });
        if (!belongsToBrand) return false;
      }

      if (selectedProcess !== "ALL") {
        const hasProcess = empAssignments.some((a) => a.processId === selectedProcess);
        if (!hasProcess) return false;
      }

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (!emp.name.toLowerCase().includes(q) && !emp.role.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [engineInput.employees, engineInput.assignments, selectedPod, selectedBrand, selectedProcess, searchQuery, procMap]);

  // Generate / Regenerate Roster
  const handleGenerate = (preserveLocked: boolean) => {
    startTransition(async () => {
      const res = await generateRosterAction(month, preserveLocked);
      if (res.success && res.data) {
        setEntries(res.data.entries);
        setIssues(res.data.issues);
        setRoster({
          id: `roster-${month}`,
          month,
          status: "DRAFT",
          version: (roster?.version || 0) + 1,
          generatedAt: new Date().toISOString(),
        });
      }
    });
  };

  // Cell Click -> Open Editor
  const handleCellClick = (emp: EmployeeData, dateStr: string) => {
    const entry = entryMap.get(emp.id)?.get(dateStr);
    setCellModal({
      isOpen: true,
      employee: emp,
      date: dateStr,
      currentStatus: entry ? entry.status : "WORKING",
      locked: entry ? entry.locked : false,
      isManual: entry ? entry.source === "MANUAL" : false,
      diffInfo: null,
    });
  };

  // Save Cell Edit
  const handleSaveCell = () => {
    if (!cellModal.employee) return;
    startTransition(async () => {
      const res = await updateRosterCellAction(
        month,
        cellModal.employee!.id,
        cellModal.date,
        cellModal.currentStatus,
        cellModal.locked
      );

      if (res.success && res.data) {
        setIssues(res.data.issuesAfter);
        setEntries((prev) =>
          prev.map((e) => {
            if (e.employeeId === cellModal.employee!.id && e.date === cellModal.date) {
              return {
                ...e,
                status: cellModal.currentStatus,
                locked: cellModal.locked,
                source: "MANUAL",
              };
            }
            return e;
          })
        );
        setCellModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Publish
  const handlePublishClick = () => {
    const errorCount = issues.filter((i) => i.severity === "ERROR").length;
    setPublishModal({
      isOpen: true,
      acknowledge: false,
      errorCount,
    });
  };

  const handleConfirmPublish = () => {
    startTransition(async () => {
      const res = await publishRosterAction(month, publishModal.acknowledge);
      if (res.success) {
        setRoster((prev) => (prev ? { ...prev, status: "PUBLISHED" } : null));
        setPublishModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    const csv = generateRosterCsv(month, engineInput.employees, entries, engineInput.pods);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `roster-${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const errorCount = issues.filter((i) => i.severity === "ERROR").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 border border-border rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Roster:
            </span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {month}
            </span>
          </div>

          <Badge
            variant={roster?.status === "PUBLISHED" ? "success" : "warning"}
            size="md"
          >
            {roster ? roster.status : "UNGENERATED"}
          </Badge>

          {roster && (
            <span className="text-xs text-slate-400 tabular-nums">
              v{roster.version}
            </span>
          )}

          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800">
              <AlertOctagon size={13} />
              <span>{errorCount} Conflict(s)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleGenerate(false)}
          >
            <Sparkles size={13} />
            {entries.length === 0 ? "Generate Roster" : "Regenerate Fresh"}
          </Button>

          {entries.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleGenerate(true)}
              title="Regenerates schedule while keeping all locked and manual edits intact"
            >
              <RefreshCw size={13} /> Preserve Locked
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={entries.length === 0}
            onClick={handleExportCsv}
          >
            <Download size={13} /> Export CSV
          </Button>

          <Button
            size="sm"
            variant="primary"
            disabled={entries.length === 0 || isPending}
            onClick={handlePublishClick}
          >
            <Send size={13} /> Publish
          </Button>
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
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground focus:outline-none"
          >
            <option value="ALL">All Pods</option>
            {engineInput.pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground focus:outline-none max-w-[150px] truncate"
          >
            <option value="ALL">All Brands</option>
            {engineInput.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedProcess}
            onChange={(e) => setSelectedProcess(e.target.value)}
            className="px-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground focus:outline-none max-w-[150px] truncate"
          >
            <option value="ALL">All Processes</option>
            {engineInput.processes.map((pr) => {
              const b = brandMap.get(pr.brandId);
              return (
                <option key={pr.id} value={pr.id}>
                  {b?.name} - {pr.type}
                </option>
              );
            })}
          </select>

          <div className="relative">
            <Search size={13} className="absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-xs bg-surface-muted border border-border rounded text-foreground placeholder:text-slate-400 focus:outline-none w-32 focus:w-44 transition-all"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] border-t lg:border-t-0 pt-2 lg:pt-0 border-border">
          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 dark:bg-emerald-950 dark:border-emerald-800" />
            <span>Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700" />
            <span>Weekly Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 dark:bg-amber-950 dark:border-amber-800" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300 dark:bg-sky-950 dark:border-sky-800" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 dark:bg-purple-950 dark:border-purple-800" />
            <span>Comp-Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={11} className="text-slate-500" />
            <span>Locked</span>
          </div>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="border border-border rounded-md bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full border-collapse text-xs">
            {/* Table Header: Day numbers and weekdays */}
            <thead className="sticky top-0 z-20 bg-surface-muted border-b border-border select-none">
              <tr>
                {/* Sticky Employee Name Column */}
                <th className="sticky left-0 z-30 bg-surface-muted px-3 py-2 text-left font-semibold text-foreground border-r border-border min-w-[200px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  Employee / Pod
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

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={monthDates.length + 1} className="px-4 py-8 text-center text-slate-400">
                    No matching employees found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const pod = podMap.get(emp.podId);
                  const empEntries = entryMap.get(emp.id);

                  return (
                    <tr key={emp.id} className="hover:bg-surface-hover/40 transition-colors">
                      {/* Sticky Employee Name Column */}
                      <td className="sticky left-0 z-10 bg-surface px-3 py-1.5 border-r border-border font-medium text-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate max-w-[130px] font-semibold text-xs">
                            {emp.name}
                          </span>
                          {emp.isPodLead && (
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                          <span className="truncate">{pod?.name.replace(/Pod \w+ \((.*)\)/, "$1") || emp.role}</span>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {monthDates.map((dateStr) => {
                        const entry = empEntries?.get(dateStr);
                        const status: EntryStatus = entry ? entry.status : "WORKING";
                        const isLocked = entry ? entry.locked : false;

                        let bgClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60";
                        let shortLabel = "W";

                        if (status === "WEEKLY_OFF") {
                          bgClass = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700";
                          shortLabel = "OFF";
                        } else if (status === "LEAVE") {
                          bgClass = "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800";
                          shortLabel = "LV";
                        } else if (status === "HOLIDAY") {
                          bgClass = "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800";
                          shortLabel = "HOL";
                        } else if (status === "COMP_OFF") {
                          bgClass = "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800";
                          shortLabel = "CO";
                        }

                        return (
                          <td
                            key={dateStr}
                            onClick={() => handleCellClick(emp, dateStr)}
                            className="p-0.5 border-r border-border text-center cursor-pointer select-none"
                            title={`${emp.name} on ${dateStr}: ${status}${isLocked ? " (Locked)" : ""}`}
                          >
                            <div
                              className={`h-7 rounded flex items-center justify-center font-semibold text-[10px] relative transition-transform hover:scale-[1.03] border ${bgClass}`}
                            >
                              <span>{shortLabel}</span>
                              {isLocked && (
                                <Lock
                                  size={9}
                                  className="absolute top-0.5 right-0.5 opacity-70"
                                />
                              )}
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

      {/* CELL EDIT MODAL */}
      <Modal
        isOpen={cellModal.isOpen}
        onClose={() => setCellModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Edit Schedule: ${cellModal.employee?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCellModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveCell} disabled={isPending}>
              {isPending ? "Validating & Saving..." : "Apply & Validate"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-surface-muted border border-border rounded text-xs flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{cellModal.employee?.name}</span>
              <span className="font-mono text-slate-500">{formatHumanDate(cellModal.date || "2026-11-01")}</span>
            </div>
            <span className="text-slate-500">{cellModal.employee?.role}</span>
          </div>

          <Select
            label="Schedule Status"
            value={cellModal.currentStatus}
            onChange={(e) =>
              setCellModal((prev) => ({
                ...prev,
                currentStatus: e.target.value as EntryStatus,
              }))
            }
          >
            <option value="WORKING">WORKING (Active Shift)</option>
            <option value="WEEKLY_OFF">WEEKLY_OFF (Scheduled Off)</option>
            <option value="LEAVE">LEAVE (Planned/Approved)</option>
            <option value="HOLIDAY">HOLIDAY (Closed Holiday)</option>
            <option value="COMP_OFF">COMP_OFF (Earned Compensatory Off)</option>
          </Select>

          <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={cellModal.locked}
              onChange={(e) =>
                setCellModal((prev) => ({ ...prev, locked: e.target.checked }))
              }
              className="rounded border-border text-accent focus:ring-accent"
            />
            Lock cell (prevents auto-generator from modifying this assignment)
          </label>

          <p className="text-[11px] text-slate-400 mt-1">
            Applying this manual edit will instantly re-run the central validator, evaluate coverage across all assigned brands, and log the before/after issue state to the change history.
          </p>
        </div>
      </Modal>

      {/* PUBLISH CONFIRMATION MODAL */}
      <Modal
        isOpen={publishModal.isOpen}
        onClose={() => setPublishModal((prev) => ({ ...prev, isOpen: false }))}
        title="Publish Official Roster"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPublishModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={publishModal.errorCount > 0 ? "danger" : "primary"}
              disabled={
                isPending ||
                (publishModal.errorCount > 0 && !publishModal.acknowledge)
              }
              onClick={handleConfirmPublish}
            >
              {isPending ? "Publishing..." : "Confirm Publish"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {publishModal.errorCount === 0 ? (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  Ready to Publish
                </span>
                <p className="text-xs text-slate-500">
                  All hard constraints, min-staff targets, and weekly off quotas are fully verified for {month}.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Unresolved Critical Issues ({publishModal.errorCount})
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    The validator detected {publishModal.errorCount} active hard constraint violation(s) (such as unstaffed days or structural gaps). Publishing now will mark this roster as official despite active coverage gaps.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2 p-2.5 bg-rose-50/50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishModal.acknowledge}
                  onChange={(e) =>
                    setPublishModal((prev) => ({
                      ...prev,
                      acknowledge: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                />
                <span className="font-medium text-foreground">
                  I acknowledge that active ERROR issues exist and explicitly authorize publishing this roster.
                </span>
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
