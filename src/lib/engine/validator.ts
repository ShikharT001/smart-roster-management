import {
  EngineInput,
  Issue,
  RosterEntryData,
  EmployeeData,
  ProcessData,
} from "./types";
import {
  getMonthDates,
  getDayOfWeek,
  formatHumanDate,
  getWeeksInMonth,
} from "./date-utils";
import { requiredCoverage, isHoliday } from "./coverage";
import { checkFeasibility } from "./feasibility";

export function validateRoster(
  input: EngineInput,
  entriesToValidate?: RosterEntryData[]
): Issue[] {
  const issues: Issue[] = [];
  const entries = entriesToValidate || input.existingEntries || [];
  const monthDates = getMonthDates(input.month);

  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const empMap = new Map(input.employees.map((e) => [e.id, e]));
  const procMap = new Map(input.processes.map((p) => [p.id, p]));

  // Index entries by employeeId -> date -> RosterEntryData
  const entryIndex = new Map<string, Map<string, RosterEntryData>>();
  for (const entry of entries) {
    let empEntries = entryIndex.get(entry.employeeId);
    if (!empEntries) {
      empEntries = new Map();
      entryIndex.set(entry.employeeId, empEntries);
    }
    empEntries.set(entry.date, entry);
  }

  // 1. Include Structural Gaps from feasibility check
  const structuralIssues = checkFeasibility(input);
  // Keep structural gaps that are not already purely leave-based (as leaves will be checked against actual entries)
  for (const sIssue of structuralIssues) {
    if (sIssue.type === "STRUCTURAL_GAP") {
      issues.push(sIssue);
    }
  }

  // 2. HARD CONSTRAINT: Required Coverage per Process per Date
  for (const process of input.processes) {
    const brand = brandMap.get(process.brandId);
    const brandName = brand ? brand.name : "Unknown Brand";

    // Find all assigned employees for this process
    const processAssignments = input.assignments.filter(
      (a) => a.processId === process.id
    );
    const assignedEmpIds = new Set(processAssignments.map((a) => a.employeeId));

    for (const dateStr of monthDates) {
      const required = requiredCoverage(
        process,
        dateStr,
        input.holidays,
        input.coverageOverrides
      );

      if (required <= 0) continue;

      // Count assigned employees who are WORKING on this date
      const workingAssignedEmps: EmployeeData[] = [];
      for (const empId of assignedEmpIds) {
        const emp = empMap.get(empId);
        if (!emp || !emp.active) continue;

        const entry = entryIndex.get(empId)?.get(dateStr);
        if (entry && entry.status === "WORKING") {
          workingAssignedEmps.push(emp);
        }
      }

      if (workingAssignedEmps.length === 0) {
        issues.push({
          id: `no-cov-${process.id}-${dateStr}`,
          severity: "ERROR",
          type: "NO_COVERAGE",
          brandId: process.brandId,
          processId: process.id,
          date: dateStr,
          employeeIds: Array.from(assignedEmpIds),
          message: `Brand ${brandName} / ${process.type} has NO COVERAGE on ${formatHumanDate(dateStr)} (required: ${required}, active working: 0).`,
          suggestions: [
            `Assign a replacement worker from the same pod`,
            `Change a scheduled weekly off on ${dateStr} to another day`,
            `Cross-assign a float employee to cover this date`,
          ],
        });
      } else if (workingAssignedEmps.length < required) {
        issues.push({
          id: `under-staff-${process.id}-${dateStr}`,
          severity: "ERROR",
          type: "UNDER_STAFFED",
          brandId: process.brandId,
          processId: process.id,
          date: dateStr,
          employeeIds: workingAssignedEmps.map((e) => e.id),
          message: `Brand ${brandName} / ${process.type} is under-staffed on ${formatHumanDate(dateStr)} (required: ${required}, currently working: ${workingAssignedEmps.length} [${workingAssignedEmps.map((e) => e.name).join(", ")}]).`,
          suggestions: [
            `Add 1 more employee on ${formatHumanDate(dateStr)} to meet min staff requirement of ${required}`,
          ],
        });
      }
    }
  }

  // 3. HARD CONSTRAINT: No WORKING status on Approved Leave or Comp-off
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empEntries = entryIndex.get(emp.id);
    if (!empEntries) continue;

    for (const [dateStr, entry] of empEntries.entries()) {
      if (entry.status !== "WORKING") continue;

      // Check approved leaves
      const approvedLeave = input.leaves.find(
        (l) =>
          l.employeeId === emp.id &&
          l.date === dateStr &&
          l.status === "APPROVED"
      );

      if (approvedLeave) {
        issues.push({
          id: `leave-conflict-${emp.id}-${dateStr}`,
          severity: "ERROR",
          type: "LEAVE_CONFLICT",
          date: dateStr,
          employeeIds: [emp.id],
          message: `${emp.name} is scheduled as WORKING on ${formatHumanDate(dateStr)} despite having an approved ${approvedLeave.type} leave.`,
          suggestions: [
            `Change ${emp.name}'s status to LEAVE for ${dateStr}`,
            `Cancel or reject the leave request in Setup if employee intends to work`,
          ],
        });
      }
    }
  }

  // 4. HARD CONSTRAINT: Maximum Consecutive Working Days
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empEntries = entryIndex.get(emp.id);
    if (!empEntries) continue;

    let consecutive = 0;
    let streakStartDate = "";

    for (const dateStr of monthDates) {
      const entry = empEntries.get(dateStr);
      const isWorking = entry && entry.status === "WORKING";

      if (isWorking) {
        if (consecutive === 0) {
          streakStartDate = dateStr;
        }
        consecutive++;

        if (consecutive > emp.maxConsecutiveWorkingDays) {
          issues.push({
            id: `consecutive-work-${emp.id}-${dateStr}`,
            severity: "ERROR",
            type: "OVERWORK_CONSECUTIVE",
            date: dateStr,
            employeeIds: [emp.id],
            message: `${emp.name} exceeds max consecutive working days (${consecutive} consecutive days from ${formatHumanDate(streakStartDate)} to ${formatHumanDate(dateStr)}, limit is ${emp.maxConsecutiveWorkingDays}).`,
            suggestions: [
              `Schedule a weekly off for ${emp.name} on or before ${formatHumanDate(dateStr)}`,
            ],
          });
        }
      } else {
        consecutive = 0;
        streakStartDate = "";
      }
    }
  }

  // 5. HARD/WARNING CONSTRAINT: Weekly Offs Count per Week
  const weeks = getWeeksInMonth(input.month);
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empEntries = entryIndex.get(emp.id);
    if (!empEntries) continue;

    weeks.forEach((weekDates, idx) => {
      // Only evaluate full 7-day weeks or weeks with at least 5 days for strict count
      if (weekDates.length < 5) return;

      let offsCount = 0;
      for (const d of weekDates) {
        const entry = empEntries.get(d);
        if (
          entry &&
          (entry.status === "WEEKLY_OFF" ||
            entry.status === "COMP_OFF" ||
            entry.status === "HOLIDAY")
        ) {
          offsCount++;
        }
      }

      if (offsCount < emp.weeklyOffsPerWeek) {
        issues.push({
          id: `weekly-off-deficit-${emp.id}-week-${idx + 1}`,
          severity: "ERROR",
          type: "WEEKLY_OFF_VIOLATION",
          date: weekDates[0],
          employeeIds: [emp.id],
          message: `${emp.name} received only ${offsCount} off day(s) in Week ${idx + 1} (${formatHumanDate(weekDates[0])} - ${formatHumanDate(weekDates[weekDates.length - 1])}), but configuration requires ${emp.weeklyOffsPerWeek}.`,
          suggestions: [
            `Add ${emp.weeklyOffsPerWeek - offsCount} additional weekly off day for ${emp.name} in Week ${idx + 1}`,
          ],
        });
      }
    });
  }

  // 6. SOFT CONSTRAINT: Preferred Weekly Off Days
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (const emp of input.employees) {
    if (!emp.active || !emp.preferredWeeklyOffDays || emp.preferredWeeklyOffDays.length === 0) {
      continue;
    }
    const empEntries = entryIndex.get(emp.id);
    if (!empEntries) continue;

    for (const dateStr of monthDates) {
      const entry = empEntries.get(dateStr);
      if (entry && entry.status === "WEEKLY_OFF") {
        const dow = getDayOfWeek(dateStr);
        if (!emp.preferredWeeklyOffDays.includes(dow)) {
          const prefNames = emp.preferredWeeklyOffDays.map((d) => DAY_NAMES[d]).join(", ");
          issues.push({
            id: `pref-violation-${emp.id}-${dateStr}`,
            severity: "INFO",
            type: "PREFERENCE_VIOLATED",
            date: dateStr,
            employeeIds: [emp.id],
            message: `${emp.name} has a weekly off on ${formatHumanDate(dateStr)} (${DAY_NAMES[dow]}), outside preferred off day(s): ${prefNames}.`,
            suggestions: [
              `Consider swapping off day to ${prefNames} if process coverage permits`,
            ],
          });
        }
      }
    }
  }

  // 7. MULTI-BRAND CASCADE: Track multi-brand coverage impacts
  for (const emp of input.employees) {
    if (!emp.active) continue;
    const empAssignments = input.assignments.filter((a) => a.employeeId === emp.id);
    if (empAssignments.length <= 1) continue;

    const empEntries = entryIndex.get(emp.id);
    if (!empEntries) continue;

    // Assigned to multiple processes/brands
    for (const dateStr of monthDates) {
      const entry = empEntries.get(dateStr);
      if (entry && entry.status !== "WORKING") {
        // Employee is OFF or LEAVE. Check if 2 or more of their processes were open today
        const openProcesses = empAssignments
          .map((a) => procMap.get(a.processId))
          .filter(
            (p): p is ProcessData =>
              p !== undefined &&
              requiredCoverage(p, dateStr, input.holidays, input.coverageOverrides) > 0
          );

        if (openProcesses.length >= 2) {
          const brandNames = openProcesses
            .map((p) => brandMap.get(p.brandId)?.name || p.brandId)
            .join(", ");

          issues.push({
            id: `cascade-${emp.id}-${dateStr}`,
            severity: "INFO",
            type: "MULTI_BRAND_CASCADE",
            date: dateStr,
            employeeIds: [emp.id],
            message: `${emp.name} is ${entry.status} on ${formatHumanDate(dateStr)}, impacting multiple brands simultaneously: ${brandNames}.`,
            suggestions: [
              `Verify backup coverage across all assigned brands (${brandNames})`,
            ],
          });
        }
      }
    }
  }

  return issues;
}
