"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  Issue,
  EngineInput,
  IssueSeverity,
  ReplacementCandidate,
} from "@/lib/engine/types";
import {
  getRankedReplacementsAction,
  applySwapAction,
} from "@/lib/actions/roster";
import { generateIssuesCsv } from "@/lib/export/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Download,
  Filter,
  Search,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface IssuesClientProps {
  month: string;
  initialIssues: Issue[];
  engineInput: EngineInput;
}

export const IssuesClient: React.FC<IssuesClientProps> = ({
  month,
  initialIssues,
  engineInput,
}) => {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [selectedSeverity, setSelectedSeverity] = useState<"ALL" | IssueSeverity>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Replacement Resolver Drawer/Modal state
  const [resolveModal, setResolveModal] = useState<{
    isOpen: boolean;
    issue: Issue | null;
    candidates: ReplacementCandidate[];
    loadingCandidates: boolean;
  }>({
    isOpen: false,
    issue: null,
    candidates: [],
    loadingCandidates: false,
  });

  const brandMap = useMemo(
    () => new Map(engineInput.brands.map((b) => [b.id, b])),
    [engineInput.brands]
  );
  const procMap = useMemo(
    () => new Map(engineInput.processes.map((p) => [p.id, p])),
    [engineInput.processes]
  );
  const empMap = useMemo(
    () => new Map(engineInput.employees.map((e) => [e.id, e])),
    [engineInput.employees]
  );

  const toggleExpand = (id: string) => {
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Resolve Modal & fetch ranked replacements
  const handleOpenResolve = (issue: Issue) => {
    if (!issue.date || !issue.processId) return;

    setResolveModal({
      isOpen: true,
      issue,
      candidates: [],
      loadingCandidates: true,
    });

    startTransition(async () => {
      const res = await getRankedReplacementsAction(
        month,
        issue.date!,
        issue.processId!
      );
      if (res.success && res.data) {
        setResolveModal((prev) => ({
          ...prev,
          candidates: res.data || [],
          loadingCandidates: false,
        }));
      } else {
        setResolveModal((prev) => ({
          ...prev,
          loadingCandidates: false,
        }));
      }
    });
  };

  // Apply Swap
  const handleApplySwap = (candidateEmpId: string) => {
    if (!resolveModal.issue || !resolveModal.issue.date || !resolveModal.issue.processId) {
      return;
    }

    const targetDate = resolveModal.issue.date;
    const processId = resolveModal.issue.processId;
    const originalEmpId = resolveModal.issue.employeeIds[0];

    startTransition(async () => {
      const res = await applySwapAction(
        month,
        targetDate,
        processId,
        candidateEmpId,
        originalEmpId
      );

      if (res.success) {
        // Remove or update the resolved issue from client state
        setIssues((prev) => prev.filter((i) => i.id !== resolveModal.issue?.id));
        setResolveModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const csv = generateIssuesCsv(
      month,
      issues,
      engineInput.brands,
      engineInput.processes,
      engineInput.employees
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `roster-issues-${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (selectedSeverity !== "ALL" && iss.severity !== selectedSeverity) {
        return false;
      }
      if (selectedBrand !== "ALL" && iss.brandId !== selectedBrand) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const brandName = (iss.brandId ? brandMap.get(iss.brandId)?.name : "") || "";
        const msg = iss.message.toLowerCase();
        const type = iss.type.toLowerCase();
        if (!brandName.toLowerCase().includes(q) && !msg.includes(q) && !type.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [issues, selectedSeverity, selectedBrand, searchQuery, brandMap]);

  const errorCount = issues.filter((i) => i.severity === "ERROR").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = issues.filter((i) => i.severity === "INFO").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 border border-border rounded-md shadow-sm">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Central Constraint & Anomaly Monitor ({month})
          </h1>
          <p className="text-xs text-slate-500">
            Source-of-truth validator report. The system never hides an unstaffed shift or broken rule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download size={13} /> Export Issues CSV
          </Button>
        </div>
      </div>

      {/* Filter and Severity Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 border border-border rounded-md text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500 uppercase">Filters:</span>
          </div>

          <div className="inline-flex rounded border border-border bg-surface-muted p-0.5">
            <button
              onClick={() => setSelectedSeverity("ALL")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                selectedSeverity === "ALL"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-slate-500 hover:text-foreground"
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setSelectedSeverity("ERROR")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${
                selectedSeverity === "ERROR"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shadow-sm"
                  : "text-slate-500 hover:text-foreground"
              }`}
            >
              Errors ({errorCount})
            </button>
            <button
              onClick={() => setSelectedSeverity("WARNING")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${
                selectedSeverity === "WARNING"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-sm"
                  : "text-slate-500 hover:text-foreground"
              }`}
            >
              Warnings ({warningCount})
            </button>
            <button
              onClick={() => setSelectedSeverity("INFO")}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${
                selectedSeverity === "INFO"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-sm"
                  : "text-slate-500 hover:text-foreground"
              }`}
            >
              Info ({infoCount})
            </button>
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
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anomalies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 text-xs bg-surface-muted border border-border rounded text-foreground placeholder:text-slate-400 focus:outline-none w-full sm:w-56"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-2.5">
        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-border rounded-md flex flex-col items-center justify-center gap-2">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <span className="text-sm font-semibold text-foreground">
              Zero Conflicts Detected
            </span>
            <p className="text-xs text-slate-500 max-w-sm">
              All staffing levels match required coverage, employee leaves are respected, and weekly-off quotas are satisfied.
            </p>
          </div>
        ) : (
          filteredIssues.map((iss) => {
            const isExpanded = expandedIssueIds.has(iss.id);
            const brand = iss.brandId ? brandMap.get(iss.brandId) : null;
            const proc = iss.processId ? procMap.get(iss.processId) : null;
            const canResolve = Boolean(iss.date && iss.processId);

            return (
              <div
                key={iss.id}
                className="bg-surface border border-border rounded-md overflow-hidden transition-colors"
              >
                {/* Issue Header */}
                <div className="p-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="mt-0.5 flex-shrink-0">
                      {iss.severity === "ERROR" ? (
                        <AlertOctagon size={16} className="text-rose-600 dark:text-rose-400" />
                      ) : iss.severity === "WARNING" ? (
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Info size={16} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            iss.severity === "ERROR"
                              ? "error"
                              : iss.severity === "WARNING"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                        >
                          {iss.type}
                        </Badge>
                        {brand && (
                          <span className="text-xs font-semibold text-foreground">
                            {brand.name}
                          </span>
                        )}
                        {proc && (
                          <span className="text-xs text-slate-500">
                            / {proc.type}
                          </span>
                        )}
                        {iss.date && (
                          <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {iss.date}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {iss.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {canResolve && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenResolve(iss)}
                      >
                        <UserCheck size={13} /> Find Replacements
                      </Button>
                    )}
                    <button
                      onClick={() => toggleExpand(iss.id)}
                      className="p-1 rounded text-slate-400 hover:text-foreground hover:bg-surface-hover"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Suggestions */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border bg-surface-muted text-xs flex flex-col gap-2">
                    {iss.suggestions.length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground block mb-1">
                          Actionable Recommendations:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                          {iss.suggestions.map((sug, idx) => (
                            <li key={idx}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {iss.employeeIds.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                        <span>Associated Employees:</span>
                        {iss.employeeIds.map((eid) => (
                          <Badge key={eid} variant="neutral" size="sm">
                            {empMap.get(eid)?.name || eid}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* RESOLVE / REPLACEMENT MODAL */}
      <Modal
        isOpen={resolveModal.isOpen}
        onClose={() => setResolveModal((prev) => ({ ...prev, isOpen: false }))}
        title="Ranked Replacement Candidates"
        maxWidth="lg"
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResolveModal((prev) => ({ ...prev, isOpen: false }))}
          >
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="p-2.5 bg-surface-muted border border-border rounded text-xs flex flex-col gap-1">
            <span className="font-semibold text-foreground">
              Coverage Gap on {resolveModal.issue?.date}
            </span>
            <span className="text-slate-500">
              {brandMap.get(resolveModal.issue?.brandId || "")?.name} /{" "}
              {procMap.get(resolveModal.issue?.processId || "")?.type}
            </span>
          </div>

          {resolveModal.loadingCandidates ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Evaluating candidate roster constraints, consecutive days, and brand coverage...
            </div>
          ) : resolveModal.candidates.length === 0 ? (
            <div className="py-6 text-center text-xs text-rose-600 dark:text-rose-400">
              No eligible replacement candidates found without creating new coverage deficits.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {resolveModal.candidates.map((cand, idx) => (
                <div
                  key={cand.employeeId}
                  className="p-3 bg-surface border border-border rounded-md flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-5 text-center tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {cand.name}
                        </span>
                        {cand.isSamePod && (
                          <Badge variant="info" size="sm">
                            Same Pod
                          </Badge>
                        )}
                        {cand.isAlreadyAssigned && (
                          <Badge variant="success" size="sm">
                            Trained
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {cand.reason}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={isPending}
                      onClick={() => handleApplySwap(cand.employeeId)}
                    >
                      <UserCheck size={12} /> Apply Swap
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
