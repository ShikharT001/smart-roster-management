import React from "react";
import { getRosterByMonth, getRosterChangeLogs } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRight, ShieldCheck, ShieldAlert, Clock, User } from "lucide-react";

export const dynamic = "force-dynamic";

interface ChangeLogPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ChangeLogPage({ searchParams }: ChangeLogPageProps) {
  const params = await searchParams;
  const month = params.month || "2026-11";

  const existingRoster = await getRosterByMonth(month);
  const logs = existingRoster ? await getRosterChangeLogs(existingRoster.id) : [];

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
      <div className="flex flex-col gap-1 pb-4 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Audit & Change Log ({month})
        </h1>
        <p className="text-xs text-slate-500">
          Complete chronological version history, automated generator runs, manual schedule overrides, and issue diffs.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-md flex flex-col items-center justify-center gap-2">
          <History size={32} className="text-slate-400" />
          <span className="text-sm font-semibold text-foreground">
            No Change History Recorded
          </span>
          <p className="text-xs text-slate-500 max-w-sm">
            Generate or edit a roster for {month} to record version history and validation diffs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log, idx) => {
            let issuesBeforeList: any[] = [];
            let issuesAfterList: any[] = [];
            try {
              issuesBeforeList = JSON.parse(log.issuesBefore);
              issuesAfterList = JSON.parse(log.issuesAfter);
            } catch {
              // fallback
            }

            const beforeErrors = issuesBeforeList.filter((i) => i.severity === "ERROR").length;
            const afterErrors = issuesAfterList.filter((i) => i.severity === "ERROR").length;

            return (
              <div
                key={log.id}
                className="p-4 bg-surface border border-border rounded-md flex flex-col gap-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      #{logs.length - idx}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {log.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <User size={13} />
                      <span>{log.actor}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock size={13} />
                      <span>{new Date(log.at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Validation Diff Summary */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Validation Impact:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      Before:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {issuesBeforeList.length} issues ({beforeErrors} errors)
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-slate-400" />
                    <span className="text-slate-500">
                      After:{" "}
                      <span className="font-semibold text-foreground tabular-nums">
                        {issuesAfterList.length} issues ({afterErrors} errors)
                      </span>
                    </span>
                  </div>

                  {afterErrors < beforeErrors && (
                    <Badge variant="success" size="sm">
                      Resolved {beforeErrors - afterErrors} error(s)
                    </Badge>
                  )}
                  {afterErrors > beforeErrors && (
                    <Badge variant="error" size="sm">
                      Introduced {afterErrors - beforeErrors} error(s)
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
