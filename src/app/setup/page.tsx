import React, { Suspense } from "react";
import {
  getAllPods,
  getAllEmployees,
  getAllBrands,
  getAllProcesses,
  getAllAssignments,
  getAllCoverageOverrides,
  getAllHolidays,
  getAllLeaves,
} from "@/lib/db/queries";
import { SetupClient } from "./setup-client";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [
    pods,
    employees,
    brands,
    processes,
    assignments,
    overrides,
    holidays,
    leaves,
  ] = await Promise.all([
    getAllPods(),
    getAllEmployees(),
    getAllBrands(),
    getAllProcesses(),
    getAllAssignments(),
    getAllCoverageOverrides(),
    getAllHolidays(),
    getAllLeaves(),
  ]);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Configuration & Setup
        </h1>
        <p className="text-xs text-slate-500">
          Manage operational entities, brand assignments, calendar rules, public holidays, and staff leave requests.
        </p>
      </div>

      <Suspense fallback={<div className="text-xs text-slate-400 py-8">Loading setup configuration...</div>}>
        <SetupClient
          initialPods={pods}
          initialEmployees={employees}
          initialBrands={brands}
          initialProcesses={processes}
          initialAssignments={assignments}
          initialOverrides={overrides}
          initialHolidays={holidays}
          initialLeaves={leaves}
        />
      </Suspense>
    </div>
  );
}
