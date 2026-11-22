import React, { Suspense } from "react";
import {
  getEngineInputForMonth,
  getRosterByMonth,
  getRosterEntries,
} from "@/lib/db/queries";
import { CoverageClient } from "./coverage-client";

export const dynamic = "force-dynamic";

interface CoveragePageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function CoveragePage({ searchParams }: CoveragePageProps) {
  const params = await searchParams;
  const month = params.month || "2026-11";

  const engineInput = await getEngineInputForMonth(month);
  const existingRoster = await getRosterByMonth(month);
  const entries = existingRoster
    ? await getRosterEntries(existingRoster.id)
    : [];

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-6 gap-4 max-w-[100vw] overflow-x-hidden">
      <Suspense fallback={<div className="text-xs text-slate-400 py-8">Loading coverage data...</div>}>
        <CoverageClient
          month={month}
          engineInput={engineInput}
          entries={entries}
        />
      </Suspense>
    </div>
  );
}
