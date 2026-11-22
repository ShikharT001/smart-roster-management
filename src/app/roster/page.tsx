import React, { Suspense } from "react";
import {
  getEngineInputForMonth,
  getRosterByMonth,
  getRosterEntries,
} from "@/lib/db/queries";
import { validateRoster } from "@/lib/engine";
import { RosterClient } from "./roster-client";

export const dynamic = "force-dynamic";

interface RosterPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function RosterPage({ searchParams }: RosterPageProps) {
  const params = await searchParams;
  const month = params.month || "2026-11";

  const engineInput = await getEngineInputForMonth(month);
  const existingRoster = await getRosterByMonth(month);
  const entries = existingRoster
    ? await getRosterEntries(existingRoster.id)
    : [];

  const currentIssues = entries.length > 0
    ? validateRoster(engineInput, entries)
    : [];

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 gap-4 max-w-[100vw] overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-400 py-8">Loading roster data...</div>}>
        <RosterClient
          month={month}
          initialRoster={existingRoster}
          initialEntries={entries}
          initialIssues={currentIssues}
          engineInput={engineInput}
        />
      </Suspense>
    </div>
  );
}
