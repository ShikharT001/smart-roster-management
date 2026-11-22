import { db } from "./client";
import {
  pods,
  employees,
  brands,
  processes,
  assignments,
  coverageOverrides,
  holidays,
  leaves,
  rosters,
  rosterEntries,
  rosterChangeLogs,
} from "./schema";
import { eq, desc, and } from "drizzle-orm";
import {
  EngineInput,
  PodData,
  EmployeeData,
  BrandData,
  ProcessData,
  AssignmentData,
  CoverageOverrideData,
  HolidayData,
  LeaveData,
  RosterEntryData,
  CalendarRule,
  LeaveType,
  LeaveStatus,
  EntryStatus,
  EntrySource,
} from "../engine/types";

export async function getAllPods(): Promise<PodData[]> {
  const result = await db.select().from(pods).orderBy(pods.name);
  return result.map((r) => ({
    id: r.id,
    name: r.name,
    leadEmployeeId: r.leadEmployeeId,
  }));
}

export async function getAllEmployees(): Promise<EmployeeData[]> {
  const result = await db.select().from(employees).orderBy(employees.name);
  return result.map((r) => {
    let prefs: number[] = [0];
    try {
      prefs = JSON.parse(r.preferredWeeklyOffDays);
    } catch {
      prefs = [0];
    }
    return {
      id: r.id,
      name: r.name,
      podId: r.podId,
      role: r.role,
      isPodLead: Boolean(r.isPodLead),
      preferredWeeklyOffDays: prefs,
      maxConsecutiveWorkingDays: r.maxConsecutiveWorkingDays,
      weeklyOffsPerWeek: r.weeklyOffsPerWeek,
      active: Boolean(r.active),
    };
  });
}

export async function getAllBrands(): Promise<BrandData[]> {
  const result = await db.select().from(brands).orderBy(brands.name);
  return result.map((r) => ({
    id: r.id,
    name: r.name,
    active: Boolean(r.active),
  }));
}

export async function getAllProcesses(): Promise<ProcessData[]> {
  const result = await db.select().from(processes).orderBy(processes.type);
  return result.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    type: r.type,
    calendarRule: r.calendarRule as CalendarRule,
    minStaffDefault: r.minStaffDefault,
  }));
}

export async function getAllAssignments(): Promise<AssignmentData[]> {
  const result = await db.select().from(assignments);
  return result.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    processId: r.processId,
    isPrimary: Boolean(r.isPrimary),
  }));
}

export async function getAllCoverageOverrides(): Promise<CoverageOverrideData[]> {
  const result = await db.select().from(coverageOverrides);
  return result.map((r) => ({
    id: r.id,
    processId: r.processId,
    date: r.date,
    weekday: r.weekday,
    minStaff: r.minStaff,
  }));
}

export async function getAllHolidays(): Promise<HolidayData[]> {
  const result = await db.select().from(holidays).orderBy(holidays.date);
  return result.map((r) => ({
    id: r.id,
    date: r.date,
    name: r.name,
  }));
}

export async function getAllLeaves(): Promise<LeaveData[]> {
  const result = await db.select().from(leaves).orderBy(desc(leaves.date));
  return result.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    date: r.date,
    type: r.type as LeaveType,
    status: r.status as LeaveStatus,
  }));
}

export async function getRosterByMonth(month: string) {
  const result = await db
    .select()
    .from(rosters)
    .where(eq(rosters.month, month))
    .limit(1);
  return result[0] || null;
}

export async function getRosterEntries(rosterId: string): Promise<RosterEntryData[]> {
  const result = await db
    .select()
    .from(rosterEntries)
    .where(eq(rosterEntries.rosterId, rosterId));

  return result.map((r) => ({
    id: r.id,
    rosterId: r.rosterId,
    employeeId: r.employeeId,
    date: r.date,
    status: r.status as EntryStatus,
    locked: Boolean(r.locked),
    source: r.source as EntrySource,
  }));
}

export async function getRosterChangeLogs(rosterId: string) {
  return await db
    .select()
    .from(rosterChangeLogs)
    .where(eq(rosterChangeLogs.rosterId, rosterId))
    .orderBy(desc(rosterChangeLogs.at));
}

export async function getEngineInputForMonth(month: string): Promise<EngineInput> {
  const [
    podsList,
    employeesList,
    brandsList,
    processesList,
    assignmentsList,
    overridesList,
    holidaysList,
    leavesList,
    existingRoster,
  ] = await Promise.all([
    getAllPods(),
    getAllEmployees(),
    getAllBrands(),
    getAllProcesses(),
    getAllAssignments(),
    getAllCoverageOverrides(),
    getAllHolidays(),
    getAllLeaves(),
    getRosterByMonth(month),
  ]);

  let existingEntries: RosterEntryData[] = [];
  if (existingRoster) {
    existingEntries = await getRosterEntries(existingRoster.id);
  }

  return {
    month,
    pods: podsList,
    employees: employeesList,
    brands: brandsList,
    processes: processesList,
    assignments: assignmentsList,
    coverageOverrides: overridesList,
    holidays: holidaysList,
    leaves: leavesList,
    existingEntries,
  };
}

export interface DependencyCheckResult {
  hasDependencies: boolean;
  canDelete: boolean;
  count: number;
  message: string;
  details: string[];
}

export async function checkEntityDependencies(
  type: "pod" | "brand" | "process" | "employee",
  id: string
): Promise<DependencyCheckResult> {
  if (type === "pod") {
    const emps = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.podId, id));

    if (emps.length > 0) {
      return {
        hasDependencies: true,
        canDelete: false,
        count: emps.length,
        message: `This pod has ${emps.length} assigned employee(s). You must reassign them to another pod before deleting.`,
        details: emps.map((e) => e.name),
      };
    }
  }

  if (type === "brand") {
    const procs = await db
      .select({ id: processes.id, type: processes.type })
      .from(processes)
      .where(eq(processes.brandId, id));

    if (procs.length > 0) {
      return {
        hasDependencies: true,
        canDelete: true,
        count: procs.length,
        message: `Deleting this brand will cascade and delete ${procs.length} process(es) and all their associated assignments.`,
        details: procs.map((p) => p.type),
      };
    }
  }

  if (type === "process") {
    const asgns = await db
      .select({ id: assignments.id, empId: assignments.employeeId })
      .from(assignments)
      .where(eq(assignments.processId, id));

    if (asgns.length > 0) {
      return {
        hasDependencies: true,
        canDelete: true,
        count: asgns.length,
        message: `Deleting this process will remove ${asgns.length} employee assignment(s) and any coverage overrides configured for it.`,
        details: [`${asgns.length} assignment(s) affected`],
      };
    }
  }

  if (type === "employee") {
    const asgns = await db
      .select({ id: assignments.id, procId: assignments.processId })
      .from(assignments)
      .where(eq(assignments.employeeId, id));

    const lvs = await db
      .select({ id: leaves.id, date: leaves.date })
      .from(leaves)
      .where(eq(leaves.employeeId, id));

    const total = asgns.length + lvs.length;
    if (total > 0) {
      return {
        hasDependencies: true,
        canDelete: true,
        count: total,
        message: `Deleting this employee will remove ${asgns.length} process assignment(s) and ${lvs.length} leave record(s).`,
        details: [
          `${asgns.length} process assignment(s)`,
          `${lvs.length} leave request(s)`,
        ],
      };
    }
  }

  return {
    hasDependencies: false,
    canDelete: true,
    count: 0,
    message: "No dependent records found. Safe to delete.",
    details: [],
  };
}
