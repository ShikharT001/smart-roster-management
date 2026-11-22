import {
  EngineInput,
  GenerationResult,
  RosterEntryData,
  CompOffCredit,
  ProcessData,
  EmployeeData,
} from "./types";
import {
  getMonthDates,
  getDayOfWeek,
  getWeeksInMonth,
  formatHumanDate,
} from "./date-utils";
import { requiredCoverage, isHoliday, findHoliday } from "./coverage";
import { repairRoster } from "./repair";
import { validateRoster } from "./validator";

export function generateRoster(input: EngineInput): GenerationResult {
  const monthDates = getMonthDates(input.month);
  const weeks = getWeeksInMonth(input.month);

  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const procMap = new Map(input.processes.map((p) => [p.id, p]));
  const empMap = new Map(input.employees.map((e) => [e.id, e]));

  // Index existing entries if preserving manual edits/locked
  const existingMap = new Map<string, Map<string, RosterEntryData>>();
  if (input.existingEntries && input.existingEntries.length > 0) {
    for (const e of input.existingEntries) {
      let m = existingMap.get(e.employeeId);
      if (!m) {
        m = new Map();
        existingMap.set(e.employeeId, m);
      }
      m.set(e.date, e);
    }
  }

  // Initial entries map: empId -> dateStr -> RosterEntryData
  const entriesMap = new Map<string, Map<string, RosterEntryData>>();
  for (const emp of input.employees) {
    if (!emp.active) continue;
    entriesMap.set(emp.id, new Map());
  }

  // Step 1: Pre-populate baseline (Locked / Manual edits / Leaves / Holidays)
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empEntries = entriesMap.get(emp.id)!;

    const empAssignments = input.assignments.filter((a) => a.employeeId === emp.id);
    const empProcesses = empAssignments
      .map((a) => procMap.get(a.processId))
      .filter((p): p is ProcessData => p !== undefined);

    for (const dateStr of monthDates) {
      // Check existing locked / manual entry
      const existing = existingMap.get(emp.id)?.get(dateStr);
      if (
        input.preserveManualEdits &&
        existing &&
        (existing.locked || existing.source === "MANUAL")
      ) {
        empEntries.set(dateStr, { ...existing });
        continue;
      }

      // Check approved leaves / comp-offs
      const approvedLeave = input.leaves.find(
        (l) =>
          l.employeeId === emp.id &&
          l.date === dateStr &&
          l.status === "APPROVED"
      );

      if (approvedLeave) {
        empEntries.set(dateStr, {
          employeeId: emp.id,
          date: dateStr,
          status: approvedLeave.type === "COMP_OFF" ? "COMP_OFF" : "LEAVE",
          locked: false,
          source: "AUTO",
        });
        continue;
      }

      // Check public holiday
      const hol = findHoliday(dateStr, input.holidays);
      if (hol) {
        // If NONE of employee's assigned processes operate on holidays, assign HOLIDAY
        const anyProcessRunsOnHoliday = empProcesses.some((p) => {
          return requiredCoverage(p, dateStr, input.holidays, input.coverageOverrides) > 0;
        });

        if (!anyProcessRunsOnHoliday && empProcesses.length > 0) {
          empEntries.set(dateStr, {
            employeeId: emp.id,
            date: dateStr,
            status: "HOLIDAY",
            locked: false,
            source: "AUTO",
          });
          continue;
        }
      }

      // Default initial status: WORKING
      empEntries.set(dateStr, {
        employeeId: emp.id,
        date: dateStr,
        status: "WORKING",
        locked: false,
        source: "AUTO",
      });
    }
  }

  // Step 2: Assign weekly offs, most-constrained processes first
  // Calculate process constraint score: required / headcount (higher = more constrained)
  const processConstraints = input.processes.map((proc) => {
    const assigned = input.assignments.filter((a) => a.processId === proc.id);
    const headcount = Math.max(1, assigned.length);
    const constraintScore = proc.minStaffDefault / headcount;
    return { process: proc, constraintScore, assignedEmpIds: assigned.map((a) => a.employeeId) };
  });

  processConstraints.sort((a, b) => b.constraintScore - a.constraintScore);

  for (const week of weeks) {
    for (const pc of processConstraints) {
      const proc = pc.process;

      // Group assigned employees for this process
      const assignedEmps = pc.assignedEmpIds
        .map((id) => empMap.get(id))
        .filter((e): e is EmployeeData => e !== undefined && e.active);

      // Track days already assigned off to other employees of this process in this week
      // to avoid all employees taking the same day off
      const processOffDaysInWeek: number[] = [];

      for (const emp of assignedEmps) {
        const empEntries = entriesMap.get(emp.id)!;

        // Count how many off days this employee already has in this week
        let currentOffCount = 0;
        for (const d of week) {
          const entry = empEntries.get(d);
          if (
            entry &&
            (entry.status === "WEEKLY_OFF" ||
              entry.status === "LEAVE" ||
              entry.status === "COMP_OFF" ||
              entry.status === "HOLIDAY")
          ) {
            currentOffCount++;
          }
        }

        const offsNeeded = Math.max(0, emp.weeklyOffsPerWeek - currentOffCount);
        if (offsNeeded === 0) continue;

        // Find candidate dates in this week to assign WEEKLY_OFF
        // Score each candidate date:
        // +100 if the process is closed on this day (e.g. Sunday on EXCEPT_SUNDAYS_AND_HOLIDAYS)
        // +50 if it matches employee preferred off day
        // -30 if another employee on this process is already taking off on this day
        // -200 if locked or already non-working
        const candidateDays = week.map((dateStr) => {
          const dow = getDayOfWeek(dateStr);
          const entry = empEntries.get(dateStr);
          if (!entry || entry.locked || entry.status !== "WORKING") {
            return { dateStr, score: -999, dow };
          }

          const required = requiredCoverage(
            proc,
            dateStr,
            input.holidays,
            input.coverageOverrides
          );

          let score = 0;
          if (required === 0) {
            score += 100; // Process is closed today anyway, ideal off day!
          }
          if (emp.preferredWeeklyOffDays.includes(dow)) {
            score += 50; // Aligns with preference
          }
          if (processOffDaysInWeek.includes(dow)) {
            score -= 40; // Avoid same-day off with teammates
          }

          return { dateStr, score, dow };
        });

        candidateDays.sort((a, b) => b.score - a.score);

        let assignedCount = 0;
        for (const cand of candidateDays) {
          if (cand.score <= -500) continue;
          if (assignedCount >= offsNeeded) break;

          const entry = empEntries.get(cand.dateStr)!;
          entry.status = "WEEKLY_OFF";
          processOffDaysInWeek.push(cand.dow);
          assignedCount++;
        }
      }
    }
  }

  // Flatten entries
  let flatEntries: RosterEntryData[] = [];
  for (const empEntries of entriesMap.values()) {
    for (const entry of empEntries.values()) {
      flatEntries.push(entry);
    }
  }

  // Step 3: Local repair pass
  flatEntries = repairRoster(flatEntries, input);

  // Step 4: Track Comp-off credits
  // Employees who WORK on a public holiday where their process runs
  const compOffCredits: CompOffCredit[] = [];
  for (const hol of input.holidays) {
    for (const emp of input.employees) {
      if (!emp.active) continue;
      const entry = flatEntries.find(
        (e) => e.employeeId === emp.id && e.date === hol.date
      );

      if (entry && entry.status === "WORKING") {
        const empAssignments = input.assignments.filter((a) => a.employeeId === emp.id);
        const runningProcess = empAssignments
          .map((a) => procMap.get(a.processId))
          .find(
            (p) =>
              p !== undefined &&
              requiredCoverage(p, hol.date, input.holidays, input.coverageOverrides) > 0
          );

        if (runningProcess) {
          compOffCredits.push({
            employeeId: emp.id,
            date: hol.date,
            processId: runningProcess.id,
            reason: `Worked on public holiday (${hol.name}) for active process ${runningProcess.type}`,
          });
        }
      }
    }
  }

  // Step 5: Run source-of-truth validator
  const issues = validateRoster(input, flatEntries);
  const hasErrors = issues.some((i) => i.severity === "ERROR");

  return {
    month: input.month,
    entries: flatEntries,
    issues,
    compOffCredits,
    isValid: !hasErrors,
  };
}
