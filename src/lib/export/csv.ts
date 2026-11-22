import {
  RosterEntryData,
  EmployeeData,
  Issue,
  BrandData,
  ProcessData,
  PodData,
} from "../engine/types";
import { getMonthDates } from "../engine/date-utils";

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function generateRosterCsv(
  month: string,
  employees: EmployeeData[],
  entries: RosterEntryData[],
  pods: PodData[]
): string {
  const dates = getMonthDates(month);
  const podMap = new Map(pods.map((p) => [p.id, p.name]));

  // Index entries by employeeId -> date -> status
  const entryMap = new Map<string, Map<string, string>>();
  for (const e of entries) {
    let m = entryMap.get(e.employeeId);
    if (!m) {
      m = new Map();
      entryMap.set(e.employeeId, m);
    }
    m.set(e.date, e.status);
  }

  // Header row
  const headers = [
    "Employee ID",
    "Employee Name",
    "Pod",
    "Role",
    ...dates.map((d) => d.slice(-2)), // Day numbers: 01, 02, ...
    "Total Working",
    "Total Off",
    "Total Leaves",
    "Total Holidays",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const emp of employees) {
    const empEntries = entryMap.get(emp.id) || new Map();
    let working = 0;
    let offs = 0;
    let leaves = 0;
    let holidays = 0;

    const dayStatuses = dates.map((d) => {
      const status = empEntries.get(d) || "UNSCHEDULED";
      if (status === "WORKING") working++;
      else if (status === "WEEKLY_OFF") offs++;
      else if (status === "LEAVE" || status === "COMP_OFF") leaves++;
      else if (status === "HOLIDAY") holidays++;
      return status;
    });

    const row = [
      emp.id,
      emp.name,
      podMap.get(emp.podId) || emp.podId,
      emp.role,
      ...dayStatuses,
      working,
      offs,
      leaves,
      holidays,
    ];

    rows.push(row.map(escapeCsvField).join(","));
  }

  return rows.join("\r\n");
}

export function generateIssuesCsv(
  month: string,
  issues: Issue[],
  brands: BrandData[],
  processes: ProcessData[],
  employees: EmployeeData[]
): string {
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const procMap = new Map(processes.map((p) => [p.id, p.type]));
  const empMap = new Map(employees.map((e) => [e.id, e.name]));

  const headers = [
    "Issue ID",
    "Severity",
    "Type",
    "Date",
    "Brand",
    "Process",
    "Affected Employees",
    "Message",
    "Suggestions",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const iss of issues) {
    const empNames = iss.employeeIds
      .map((id) => empMap.get(id) || id)
      .join("; ");

    const row = [
      iss.id,
      iss.severity,
      iss.type,
      iss.date || "Structural",
      iss.brandId ? brandMap.get(iss.brandId) || iss.brandId : "General",
      iss.processId ? procMap.get(iss.processId) || iss.processId : "General",
      empNames,
      iss.message,
      iss.suggestions.join(" | "),
    ];

    rows.push(row.map(escapeCsvField).join(","));
  }

  return rows.join("\r\n");
}
