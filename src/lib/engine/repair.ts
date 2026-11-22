import {
  EngineInput,
  RosterEntryData,
  ProcessData,
  EmployeeData,
} from "./types";
import { getMonthDates, getWeeksInMonth } from "./date-utils";
import { requiredCoverage } from "./coverage";

export function repairRoster(
  entries: RosterEntryData[],
  input: EngineInput
): RosterEntryData[] {
  // Deep clone entries
  const currentEntries: RosterEntryData[] = entries.map((e) => ({ ...e }));

  // Index by empId -> date -> entry
  const entryMap = new Map<string, Map<string, RosterEntryData>>();
  for (const e of currentEntries) {
    let m = entryMap.get(e.employeeId);
    if (!m) {
      m = new Map();
      entryMap.set(e.employeeId, m);
    }
    m.set(e.date, e);
  }

  const procMap = new Map(input.processes.map((p) => [p.id, p]));
  const empMap = new Map(input.employees.map((e) => [e.id, e]));
  const weeks = getWeeksInMonth(input.month);

  // 1. Repair understaffed gaps by finding eligible workers on off days in the same week
  for (const process of input.processes) {
    const processAssignments = input.assignments.filter(
      (a) => a.processId === process.id
    );
    const assignedEmpIds = processAssignments.map((a) => a.employeeId);
    if (assignedEmpIds.length <= 1) continue; // Single resource cannot swap with self

    for (const week of weeks) {
      for (const gapDate of week) {
        const required = requiredCoverage(
          process,
          gapDate,
          input.holidays,
          input.coverageOverrides
        );
        if (required <= 0) continue;

        // Check current working count for this process
        const workingEmps = assignedEmpIds.filter((empId) => {
          const entry = entryMap.get(empId)?.get(gapDate);
          return entry && entry.status === "WORKING";
        });

        if (workingEmps.length < required) {
          // We have a gap! Find an assigned employee who is on WEEKLY_OFF today and unlocked
          const candidates = assignedEmpIds.filter((empId) => {
            const entry = entryMap.get(empId)?.get(gapDate);
            return (
              entry &&
              entry.status === "WEEKLY_OFF" &&
              !entry.locked &&
              entry.source !== "MANUAL"
            );
          });

          for (const candId of candidates) {
            // Find another day in this week where this candidate can take their off instead
            // without creating a new gap for this process or their other assigned processes
            const candOtherAssignments = input.assignments.filter(
              (a) => a.employeeId === candId
            );
            const candProcesses = candOtherAssignments
              .map((a) => procMap.get(a.processId))
              .filter((p): p is ProcessData => p !== undefined);

            const alternateOffDate = week.find((altDate) => {
              if (altDate === gapDate) return false;
              const altEntry = entryMap.get(candId)?.get(altDate);
              if (!altEntry || altEntry.status !== "WORKING" || altEntry.locked) {
                return false;
              }

              // Check if all cand processes would still have coverage if cand is OFF on altDate
              for (const cp of candProcesses) {
                const req = requiredCoverage(
                  cp,
                  altDate,
                  input.holidays,
                  input.coverageOverrides
                );
                if (req <= 0) continue;

                const cpAssignments = input.assignments.filter(
                  (a) => a.processId === cp.id
                );
                const cpWorkingCount = cpAssignments.filter((a) => {
                  if (a.employeeId === candId) return false; // cand will be off
                  const e = entryMap.get(a.employeeId)?.get(altDate);
                  return e && e.status === "WORKING";
                }).length;

                if (cpWorkingCount < req) {
                  return false; // Would create a new gap
                }
              }

              return true;
            });

            if (alternateOffDate) {
              // Perform swap!
              const gapEntry = entryMap.get(candId)!.get(gapDate)!;
              const altEntry = entryMap.get(candId)!.get(alternateOffDate)!;

              gapEntry.status = "WORKING";
              altEntry.status = "WEEKLY_OFF";
              break; // Gap covered
            }
          }
        }
      }
    }
  }

  // 2. Repair max consecutive days violations
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empEntries = entryMap.get(emp.id);
    if (!empEntries) continue;

    const monthDates = getMonthDates(input.month);
    let consecutive = 0;
    let streakDates: string[] = [];

    for (const d of monthDates) {
      const entry = empEntries.get(d);
      if (entry && entry.status === "WORKING") {
        consecutive++;
        streakDates.push(d);

        if (consecutive > emp.maxConsecutiveWorkingDays) {
          // Find an unlocked day in streak where turning it to WEEKLY_OFF does not break coverage
          const empAssignments = input.assignments.filter((a) => a.employeeId === emp.id);
          const empProcesses = empAssignments
            .map((a) => procMap.get(a.processId))
            .filter((p): p is ProcessData => p !== undefined);

          const breakDay = streakDates.slice(1, -1).find((sd) => {
            const se = empEntries.get(sd);
            if (!se || se.locked) return false;

            // Check if processes remain covered without this employee
            for (const ep of empProcesses) {
              const req = requiredCoverage(
                ep,
                sd,
                input.holidays,
                input.coverageOverrides
              );
              if (req <= 0) continue;

              const epAssigned = input.assignments.filter((a) => a.processId === ep.id);
              const epWorking = epAssigned.filter((a) => {
                if (a.employeeId === emp.id) return false;
                const e = entryMap.get(a.employeeId)?.get(sd);
                return e && e.status === "WORKING";
              }).length;

              if (epWorking < req) return false;
            }
            return true;
          });

          if (breakDay) {
            const se = empEntries.get(breakDay)!;
            se.status = "WEEKLY_OFF";
            consecutive = streakDates.length - streakDates.indexOf(breakDay) - 1;
            streakDates = streakDates.slice(streakDates.indexOf(breakDay) + 1);
          }
        }
      } else {
        consecutive = 0;
        streakDates = [];
      }
    }
  }

  return currentEntries;
}
