import { EngineInput, Issue, ProcessData } from "./types";
import { getMonthDates, formatHumanDate } from "./date-utils";
import { requiredCoverage } from "./coverage";

export function checkFeasibility(input: EngineInput): Issue[] {
  const issues: Issue[] = [];
  const monthDates = getMonthDates(input.month);

  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const empMap = new Map(input.employees.map((e) => [e.id, e]));

  for (const process of input.processes) {
    const brand = brandMap.get(process.brandId);
    const brandName = brand ? brand.name : "Unknown Brand";

    // Find all active employees assigned to this process
    const processAssignments = input.assignments.filter(
      (a) => a.processId === process.id
    );
    const assignedEmployees = processAssignments
      .map((a) => empMap.get(a.employeeId))
      .filter((e): e is NonNullable<typeof e> => e !== undefined && e.active);

    const totalHeadcount = assignedEmployees.length;

    // 1. Structural check across the whole week:
    // If process requires 7-day coverage (e.g. ALL_365) and headcount is single resource
    if (process.calendarRule === "ALL_365" && totalHeadcount === 1) {
      const singleEmp = assignedEmployees[0];
      const requiredDaily = process.minStaffDefault;
      issues.push({
        id: `structural-${process.id}-single-resource-365`,
        severity: "ERROR",
        type: "STRUCTURAL_GAP",
        brandId: process.brandId,
        processId: process.id,
        employeeIds: [singleEmp.id],
        message: `Brand ${brandName} / ${process.type} operates 365 days requiring min staff ${requiredDaily}, but only 1 employee (${singleEmp.name}) is assigned. Providing ${singleEmp.weeklyOffsPerWeek} weekly off(s) per week will create recurring unstaffed days.`,
        suggestions: [
          `Assign a float/backup resource to Brand ${brandName} / ${process.type}`,
          `Cross-train an employee from the same pod (${singleEmp.podId})`,
          `Change calendar rule to EXCEPT_SUNDAYS_AND_HOLIDAYS if weekend coverage is optional`,
        ],
      });
    } else if (process.calendarRule === "ALL_365" && totalHeadcount > 1) {
      // Check if total weekly staff-days can cover weekly requirement
      const weeklyStaffDaysAvailable = assignedEmployees.reduce(
        (sum, emp) => sum + (7 - emp.weeklyOffsPerWeek),
        0
      );
      const weeklyStaffDaysRequired = process.minStaffDefault * 7;
      if (weeklyStaffDaysAvailable < weeklyStaffDaysRequired) {
        issues.push({
          id: `structural-${process.id}-capacity-deficit`,
          severity: "ERROR",
          type: "STRUCTURAL_GAP",
          brandId: process.brandId,
          processId: process.id,
          employeeIds: assignedEmployees.map((e) => e.id),
          message: `Brand ${brandName} / ${process.type} requires ${weeklyStaffDaysRequired} person-days/week, but assigned staff capacity is only ${weeklyStaffDaysAvailable} person-days/week after weekly offs.`,
          suggestions: [
            `Add at least ${Math.ceil((weeklyStaffDaysRequired - weeklyStaffDaysAvailable) / 6)} additional assigned employee(s)`,
            `Reduce min staff requirement or configure temporary overrides`,
          ],
        });
      }
    }

    // 2. Date-by-date physical capacity check
    for (const dateStr of monthDates) {
      const required = requiredCoverage(
        process,
        dateStr,
        input.holidays,
        input.coverageOverrides
      );

      if (required === 0) continue;

      if (totalHeadcount < required) {
        issues.push({
          id: `structural-${process.id}-${dateStr}-insufficient-headcount`,
          severity: "ERROR",
          type: "STRUCTURAL_GAP",
          brandId: process.brandId,
          processId: process.id,
          date: dateStr,
          employeeIds: assignedEmployees.map((e) => e.id),
          message: `Brand ${brandName} / ${process.type} needs ${required} staff on ${formatHumanDate(dateStr)}, but only ${totalHeadcount} total employee(s) are assigned to this process.`,
          suggestions: [
            `Assign at least ${required - totalHeadcount} more employee(s) to this process`,
            `Adjust the minStaff override for ${dateStr}`,
          ],
        });
        continue;
      }

      // Check available non-leave headcount on this date
      const employeesOnApprovedLeave = assignedEmployees.filter((emp) =>
        input.leaves.some(
          (l) =>
            l.employeeId === emp.id &&
            l.date === dateStr &&
            l.status === "APPROVED"
        )
      );

      const availableHeadcount = totalHeadcount - employeesOnApprovedLeave.length;
      if (availableHeadcount < required) {
        issues.push({
          id: `leave-deficit-${process.id}-${dateStr}`,
          severity: "ERROR",
          type: "LEAVE_CONFLICT",
          brandId: process.brandId,
          processId: process.id,
          date: dateStr,
          employeeIds: employeesOnApprovedLeave.map((e) => e.id),
          message: `Brand ${brandName} / ${process.type} needs ${required} person(s) on ${formatHumanDate(dateStr)}, but ${employeesOnApprovedLeave.map((e) => e.name).join(", ")} is on approved leave (leaving only ${availableHeadcount} available).`,
          suggestions: [
            `Arrange a cross-pod or backup replacement for ${employeesOnApprovedLeave.map((e) => e.name).join(", ")}`,
            `Postpone or reschedule the approved leave`,
          ],
        });
      }
    }
  }

  return issues;
}
