import { describe, it, expect } from "vitest";
import {
  requiredCoverage,
  isHoliday,
  getDaysInMonth,
  getMonthDates,
  getWeeksInMonth,
  checkFeasibility,
  validateRoster,
  generateRoster,
  repairRoster,
  findRankedReplacements,
  applyReplacement,
  EngineInput,
  ProcessData,
  HolidayData,
  CoverageOverrideData,
  EmployeeData,
  AssignmentData,
  BrandData,
  PodData,
  RosterEntryData,
} from "../src/lib/engine";

describe("Scheduling Engine Core", () => {
  // Test 1: requiredCoverage for each calendar rule
  describe("requiredCoverage across calendar rules", () => {
    const holidays: HolidayData[] = [
      { date: "2026-11-08", name: "Diwali" }, // Sunday
      { date: "2026-11-24", name: "Guru Nanak Jayanti" }, // Tuesday
    ];

    const proc365: ProcessData = {
      id: "p-365",
      brandId: "b-1",
      type: "Customer Support",
      calendarRule: "ALL_365",
      minStaffDefault: 1,
    };

    const procExceptHolidays: ProcessData = {
      id: "p-except-hol",
      brandId: "b-1",
      type: "Customer Support",
      calendarRule: "ALL_EXCEPT_HOLIDAYS",
      minStaffDefault: 1,
    };

    const procExceptSundaysAndHolidays: ProcessData = {
      id: "p-mon-sat",
      brandId: "b-1",
      type: "Customer Support",
      calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS",
      minStaffDefault: 1,
    };

    it("ALL_365 operates on regular weekdays, Sundays, and public holidays", () => {
      expect(requiredCoverage(proc365, "2026-11-02", holidays, [])).toBe(1);
      expect(requiredCoverage(proc365, "2026-11-01", holidays, [])).toBe(1);
      expect(requiredCoverage(proc365, "2026-11-24", holidays, [])).toBe(1);
      expect(requiredCoverage(proc365, "2026-11-08", holidays, [])).toBe(1);
    });

    it("ALL_EXCEPT_HOLIDAYS operates on Sundays but closes on public holidays", () => {
      expect(requiredCoverage(procExceptHolidays, "2026-11-01", holidays, [])).toBe(1);
      expect(requiredCoverage(procExceptHolidays, "2026-11-24", holidays, [])).toBe(0);
      expect(requiredCoverage(procExceptHolidays, "2026-11-25", holidays, [])).toBe(1);
    });

    it("EXCEPT_SUNDAYS_AND_HOLIDAYS closes on Sundays and public holidays", () => {
      expect(requiredCoverage(procExceptSundaysAndHolidays, "2026-11-01", holidays, [])).toBe(0);
      expect(requiredCoverage(procExceptSundaysAndHolidays, "2026-11-24", holidays, [])).toBe(0);
      expect(requiredCoverage(procExceptSundaysAndHolidays, "2026-11-02", holidays, [])).toBe(1);
    });

    it("Date-specific overrides supersede calendar rules", () => {
      const overrides: CoverageOverrideData[] = [
        { processId: "p-mon-sat", date: "2026-11-01", minStaff: 3 },
      ];
      expect(requiredCoverage(procExceptSundaysAndHolidays, "2026-11-01", holidays, overrides)).toBe(3);
    });

    it("Weekday-specific overrides supersede calendar rules", () => {
      const overrides: CoverageOverrideData[] = [
        { processId: "p-mon-sat", weekday: 0, minStaff: 2 }, // Sunday override
      ];
      expect(requiredCoverage(procExceptSundaysAndHolidays, "2026-11-01", holidays, overrides)).toBe(2);
    });
  });

  // Test 2: Holiday on a Sunday
  describe("Holiday on a Sunday", () => {
    const holidays: HolidayData[] = [
      { date: "2026-11-08", name: "Diwali" }, // Sunday
    ];

    it("correctly identifies holiday on a Sunday", () => {
      expect(isHoliday("2026-11-08", holidays)).toBe(true);
      expect(isHoliday("2026-11-09", holidays)).toBe(false);
    });

    it("EXCEPT_SUNDAYS_AND_HOLIDAYS remains closed (0) when holiday falls on a Sunday", () => {
      const proc: ProcessData = {
        id: "p-test",
        brandId: "b-1",
        type: "NDR",
        calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS",
        minStaffDefault: 2,
      };
      expect(requiredCoverage(proc, "2026-11-08", holidays, [])).toBe(0);
    });
  });

  // Test 3: Month length calculations (28, 29, 30, 31-day months)
  describe("Month length handling", () => {
    it("handles 28-day standard February", () => {
      expect(getDaysInMonth(2025, 2)).toBe(28);
      const dates = getMonthDates("2025-02");
      expect(dates.length).toBe(28);
      expect(dates[0]).toBe("2025-02-01");
      expect(dates[27]).toBe("2025-02-28");
    });

    it("handles 29-day leap year February", () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      const dates = getMonthDates("2024-02");
      expect(dates.length).toBe(29);
      expect(dates[28]).toBe("2024-02-29");
    });

    it("handles 30-day month (November)", () => {
      expect(getDaysInMonth(2026, 11)).toBe(30);
      const dates = getMonthDates("2026-11");
      expect(dates.length).toBe(30);
      expect(dates[29]).toBe("2026-11-30");
    });

    it("handles 31-day month (December)", () => {
      expect(getDaysInMonth(2026, 12)).toBe(31);
      const dates = getMonthDates("2026-12");
      expect(dates.length).toBe(31);
      expect(dates[30]).toBe("2026-12-31");
    });

    it("chunks dates into calendar weeks", () => {
      const weeks = getWeeksInMonth("2026-11");
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      // All dates accounted for
      const flattened = weeks.flat();
      expect(flattened.length).toBe(30);
    });
  });

  // Test 4: Single-resource 365-day brand (Structural Gap)
  describe("Feasibility: Single-resource 365-day structural gap", () => {
    const singleEmpInput: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod A" }],
      employees: [
        {
          id: "emp-solo",
          name: "Solo Agent",
          podId: "pod-1",
          role: "Specialist",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-solo", name: "Solo Brand", active: true }],
      processes: [
        {
          id: "proc-solo-365",
          brandId: "b-solo",
          type: "Customer Support",
          calendarRule: "ALL_365",
          minStaffDefault: 1,
        },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-solo", processId: "proc-solo-365", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
    };

    it("flags STRUCTURAL_GAP before generation", () => {
      const issues = checkFeasibility(singleEmpInput);
      const structural = issues.find((i) => i.type === "STRUCTURAL_GAP");
      expect(structural).toBeDefined();
      expect(structural?.severity).toBe("ERROR");
      expect(structural?.message).toContain("operates 365 days requiring min staff 1");
      expect(structural?.suggestions.length).toBeGreaterThan(0);
    });

    it("generator reports invalid result when structural gap exists and cannot be satisfied", () => {
      const result = generateRoster(singleEmpInput);
      expect(result.isValid).toBe(false);
      const errorIssues = result.issues.filter((i) => i.severity === "ERROR");
      expect(errorIssues.length).toBeGreaterThan(0);
    });
  });

  // Test 5: Multi-brand employee leave cascade
  describe("Multi-brand employee assignment and leave impact", () => {
    const multiBrandInput: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod Alpha" }],
      employees: [
        {
          id: "emp-shared",
          name: "Shared Associate",
          podId: "pod-1",
          role: "Operations Specialist",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [
        { id: "brand-a", name: "Brand Alpha", active: true },
        { id: "brand-b", name: "Brand Beta", active: true },
      ],
      processes: [
        { id: "proc-a", brandId: "brand-a", type: "Customer Support", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
        { id: "proc-b", brandId: "brand-b", type: "NDR", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
      ],
      assignments: [
        { id: "asgn-a", employeeId: "emp-shared", processId: "proc-a", isPrimary: true },
        { id: "asgn-b", employeeId: "emp-shared", processId: "proc-b", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [
        { employeeId: "emp-shared", date: "2026-11-10", type: "PLANNED", status: "APPROVED" },
      ],
    };

    it("leave on shared employee creates coverage deficit on BOTH assigned brands", () => {
      const issues = checkFeasibility(multiBrandInput);
      const leaveDeficits = issues.filter(
        (i) => i.type === "LEAVE_CONFLICT" && i.date === "2026-11-10"
      );
      expect(leaveDeficits.length).toBe(2);
      expect(leaveDeficits.some((i) => i.brandId === "brand-a")).toBe(true);
      expect(leaveDeficits.some((i) => i.brandId === "brand-b")).toBe(true);
    });
  });

  // Test 6: Min staff 2 shared process
  describe("Process sharing with minStaff = 2", () => {
    const sharedInput: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod Delta" }],
      employees: [
        {
          id: "emp-a",
          name: "Agent A",
          podId: "pod-1",
          role: "Specialist",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
        {
          id: "emp-b",
          name: "Agent B",
          podId: "pod-1",
          role: "Specialist",
          isPodLead: false,
          preferredWeeklyOffDays: [1],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-sleep", name: "Sleep Brand", active: true }],
      processes: [
        {
          id: "proc-sleep-cs",
          brandId: "b-sleep",
          type: "Customer Support",
          calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS",
          minStaffDefault: 2,
        },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-a", processId: "proc-sleep-cs", isPrimary: true },
        { id: "asgn-2", employeeId: "emp-b", processId: "proc-sleep-cs", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
    };

    it("requires BOTH employees working to fulfill minStaff = 2; flags UNDER_STAFFED if one is off", () => {
      const mockEntries: RosterEntryData[] = [
        { employeeId: "emp-a", date: "2026-11-03", status: "WEEKLY_OFF", locked: false, source: "AUTO" },
        { employeeId: "emp-b", date: "2026-11-03", status: "WORKING", locked: false, source: "AUTO" },
      ];

      const issues = validateRoster(sharedInput, mockEntries);
      const underStaffed = issues.find(
        (i) => i.type === "UNDER_STAFFED" && i.date === "2026-11-03"
      );
      expect(underStaffed).toBeDefined();
      expect(underStaffed?.message).toContain("required: 2, currently working: 1");
    });
  });

  // Test 7: Max consecutive working days
  describe("Max consecutive working days constraint", () => {
    const input: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod Alpha" }],
      employees: [
        {
          id: "emp-1",
          name: "Fatigued Worker",
          podId: "pod-1",
          role: "Associate",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 5,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-1", name: "Brand 1", active: true }],
      processes: [
        { id: "p-1", brandId: "b-1", type: "CS", calendarRule: "ALL_365", minStaffDefault: 1 },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-1", processId: "p-1", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
    };

    it("flags OVERWORK_CONSECUTIVE when worked days exceed maxConsecutiveWorkingDays", () => {
      const entries: RosterEntryData[] = [
        { employeeId: "emp-1", date: "2026-11-01", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-02", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-03", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-04", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-05", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-06", status: "WORKING", locked: false, source: "AUTO" },
      ];

      const issues = validateRoster(input, entries);
      const overwork = issues.find((i) => i.type === "OVERWORK_CONSECUTIVE");
      expect(overwork).toBeDefined();
      expect(overwork?.severity).toBe("ERROR");
      expect(overwork?.message).toContain("exceeds max consecutive working days (6 consecutive days");
    });
  });

  // Test 8: Locked entries respected during generation
  describe("Locked entries preservation", () => {
    const input: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod A" }],
      employees: [
        {
          id: "emp-locked",
          name: "Locked Associate",
          podId: "pod-1",
          role: "Associate",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-1", name: "Brand 1", active: true }],
      processes: [
        { id: "p-1", brandId: "b-1", type: "CS", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-locked", processId: "p-1", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
      preserveManualEdits: true,
      existingEntries: [
        {
          employeeId: "emp-locked",
          date: "2026-11-05",
          status: "WEEKLY_OFF",
          locked: true,
          source: "MANUAL",
        },
      ],
    };

    it("respects locked entry status during generation", () => {
      const result = generateRoster(input);
      const lockedEntry = result.entries.find(
        (e) => e.employeeId === "emp-locked" && e.date === "2026-11-05"
      );
      expect(lockedEntry).toBeDefined();
      expect(lockedEntry?.status).toBe("WEEKLY_OFF");
      expect(lockedEntry?.locked).toBe(true);
    });
  });

  // Test 9: Leave after generation gap detection and ranked replacement suggestions
  describe("Change handling: leave after generation and ranked replacements", () => {
    const input: EngineInput = {
      month: "2026-11",
      pods: [
        { id: "pod-1", name: "Pod Alpha" },
        { id: "pod-2", name: "Pod Beta" },
      ],
      employees: [
        {
          id: "emp-1",
          name: "Aarav Mehta",
          podId: "pod-1",
          role: "Primary Associate",
          isPodLead: true,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
        {
          id: "emp-2",
          name: "Isha Rao",
          podId: "pod-1",
          role: "Trained Associate",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
        {
          id: "emp-3",
          name: "Other Pod Associate",
          podId: "pod-2",
          role: "Associate",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-1", name: "Northwind", active: true }],
      processes: [
        { id: "p-ndr", brandId: "b-1", type: "NDR", calendarRule: "EXCEPT_SUNDAYS_AND_HOLIDAYS", minStaffDefault: 1 },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-1", processId: "p-ndr", isPrimary: true },
        { id: "asgn-2", employeeId: "emp-2", processId: "p-ndr", isPrimary: false },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
    };

    it("ranks candidates favoring same pod and already assigned, and applies replacement swap", () => {
      const entries: RosterEntryData[] = [
        { employeeId: "emp-1", date: "2026-11-04", status: "LEAVE", locked: false, source: "AUTO" },
        { employeeId: "emp-2", date: "2026-11-04", status: "WEEKLY_OFF", locked: false, source: "AUTO" },
        { employeeId: "emp-3", date: "2026-11-04", status: "WEEKLY_OFF", locked: false, source: "AUTO" },
      ];

      const ranked = findRankedReplacements("2026-11-04", "p-ndr", input, entries);
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].employeeId).toBe("emp-2");
      expect(ranked[0].isAlreadyAssigned).toBe(true);
      expect(ranked[0].isSamePod).toBe(true);

      const updatedEntries = applyReplacement(entries, "2026-11-04", "emp-2", "emp-1");
      const emp2Entry = updatedEntries.find(
        (e) => e.employeeId === "emp-2" && e.date === "2026-11-04"
      );
      expect(emp2Entry?.status).toBe("WORKING");
      expect(emp2Entry?.locked).toBe(true);

      const issues = validateRoster(input, updatedEntries);
      const gapOnDate = issues.find(
        (i) => i.processId === "p-ndr" && i.date === "2026-11-04" && i.severity === "ERROR"
      );
      expect(gapOnDate).toBeUndefined();
    });
  });

  // Test 10: Comp-off credit on working public holiday
  describe("Comp-off tracking for holiday work", () => {
    const input: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod Alpha" }],
      employees: [
        {
          id: "emp-1",
          name: "Holiday Warrior",
          podId: "pod-1",
          role: "Associate",
          isPodLead: false,
          preferredWeeklyOffDays: [1], // Monday is off; Sunday Nov 8 (Diwali) is worked
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-1", name: "24x7 Brand", active: true }],
      processes: [
        { id: "p-365", brandId: "b-1", type: "Customer Support", calendarRule: "ALL_365", minStaffDefault: 1 },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-1", processId: "p-365", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [{ date: "2026-11-08", name: "Diwali" }],
      leaves: [],
    };

    it("awards comp-off credit when an employee works on a public holiday", () => {
      const result = generateRoster(input);
      const credit = result.compOffCredits.find(
        (c) => c.employeeId === "emp-1" && c.date === "2026-11-08"
      );
      expect(credit).toBeDefined();
      expect(credit?.reason).toContain("Worked on public holiday (Diwali)");
    });
  });

  // Test 11: Generator never returns "valid" when ERROR issues exist
  describe("Strict validation integrity", () => {
    const impossibleInput: EngineInput = {
      month: "2026-11",
      pods: [{ id: "pod-1", name: "Pod Alpha" }],
      employees: [
        {
          id: "emp-1",
          name: "Overburdened Employee",
          podId: "pod-1",
          role: "Specialist",
          isPodLead: false,
          preferredWeeklyOffDays: [0],
          maxConsecutiveWorkingDays: 6,
          weeklyOffsPerWeek: 1,
          active: true,
        },
      ],
      brands: [{ id: "b-1", name: "Brand 1", active: true }],
      processes: [
        { id: "p-1", brandId: "b-1", type: "CS", calendarRule: "ALL_365", minStaffDefault: 2 },
      ],
      assignments: [
        { id: "asgn-1", employeeId: "emp-1", processId: "p-1", isPrimary: true },
      ],
      coverageOverrides: [],
      holidays: [],
      leaves: [],
    };

    it("returns isValid = false when unresolved ERROR issues exist", () => {
      const result = generateRoster(impossibleInput);
      expect(result.isValid).toBe(false);
      const errors = result.issues.filter((i) => i.severity === "ERROR");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // Test 12: Local repair pass swaps off days to eliminate gaps
  describe("Repair pass logic", () => {
    it("swaps off days between teammates in the same week to cover gaps", () => {
      const input: EngineInput = {
        month: "2026-11",
        pods: [{ id: "pod-1", name: "Pod Team" }],
        employees: [
          {
            id: "emp-1",
            name: "Worker One",
            podId: "pod-1",
            role: "Associate",
            isPodLead: false,
            preferredWeeklyOffDays: [0],
            maxConsecutiveWorkingDays: 6,
            weeklyOffsPerWeek: 1,
            active: true,
          },
          {
            id: "emp-2",
            name: "Worker Two",
            podId: "pod-1",
            role: "Associate",
            isPodLead: false,
            preferredWeeklyOffDays: [0],
            maxConsecutiveWorkingDays: 6,
            weeklyOffsPerWeek: 1,
            active: true,
          },
        ],
        brands: [{ id: "b-1", name: "Brand Team", active: true }],
        processes: [
          { id: "p-1", brandId: "b-1", type: "CS", calendarRule: "ALL_365", minStaffDefault: 1 },
        ],
        assignments: [
          { id: "asgn-1", employeeId: "emp-1", processId: "p-1", isPrimary: true },
          { id: "asgn-2", employeeId: "emp-2", processId: "p-1", isPrimary: true },
        ],
        coverageOverrides: [],
        holidays: [],
        leaves: [],
      };

      // Both workers off on 2026-11-03 (Tue), creating gap, but both working on 2026-11-04 (Wed) in same week
      const flawedEntries: RosterEntryData[] = [
        { employeeId: "emp-1", date: "2026-11-03", status: "WEEKLY_OFF", locked: false, source: "AUTO" },
        { employeeId: "emp-2", date: "2026-11-03", status: "WEEKLY_OFF", locked: false, source: "AUTO" },
        { employeeId: "emp-1", date: "2026-11-04", status: "WORKING", locked: false, source: "AUTO" },
        { employeeId: "emp-2", date: "2026-11-04", status: "WORKING", locked: false, source: "AUTO" },
      ];

      const repaired = repairRoster(flawedEntries, input);
      const workingOnTuesday = repaired.filter(
        (e) => e.date === "2026-11-03" && e.status === "WORKING"
      );
      expect(workingOnTuesday.length).toBe(1);
    });
  });
});
