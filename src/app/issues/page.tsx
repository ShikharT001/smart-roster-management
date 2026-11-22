import React, { Suspense } from "react";
import {
  getEngineInputForMonth,
  getRosterByMonth,
  getRosterEntries,
} from "@/lib/db/queries";
import { validateRoster, checkFeasibility } from "@/lib/engine";
import { IssuesClient } from "./issues-client";

export const dynamic = "force-dynamic";

interface IssuesPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const params = await searchParams;
  const month = params.month || "2026-11";

  const engineInput = await getEngineInputForMonth(month);
  const existingRoster = await getRosterByMonth(month);
  const entries = existingRoster
    ? await getRosterEntries(existingRoster.id)
    : [];

  const issues = entries.length > 0
    ? validateRoster(engineInput, entries)
    : checkFeasibility(engineInput);

  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
      <Suspense fallback={<div className="text-xs text-slate-400 py-8">Loading issues...</div>}>
        <IssuesClient
          month={month}
          initialIssues={issues}
          engineInput={engineInput}
        />
      </Suspense>
    </div>
  );
}
