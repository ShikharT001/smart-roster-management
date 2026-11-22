export type CalendarRule = "ALL_365" | "ALL_EXCEPT_HOLIDAYS" | "EXCEPT_SUNDAYS_AND_HOLIDAYS";

export type LeaveType = "PLANNED" | "COMP_OFF" | "SICK";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EntryStatus = "WORKING" | "WEEKLY_OFF" | "LEAVE" | "HOLIDAY" | "COMP_OFF";
export type EntrySource = "AUTO" | "MANUAL";

export type IssueSeverity = "ERROR" | "WARNING" | "INFO";

export type IssueType =
  | "NO_COVERAGE"
  | "UNDER_STAFFED"
  | "STRUCTURAL_GAP"
  | "LEAVE_CONFLICT"
  | "OVERWORK_CONSECUTIVE"
  | "WEEKLY_OFF_VIOLATION"
  | "OVERLAPPING_ASSIGNMENT"
  | "PREFERENCE_VIOLATED"
  | "MULTI_BRAND_CASCADE";

export interface PodData {
  id: string;
  name: string;
  leadEmployeeId?: string | null;
}

export interface EmployeeData {
  id: string;
  name: string;
  podId: string;
  role: string;
  isPodLead: boolean;
  preferredWeeklyOffDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  maxConsecutiveWorkingDays: number;
  weeklyOffsPerWeek: number;
  active: boolean;
}

export interface BrandData {
  id: string;
  name: string;
  active: boolean;
}

export interface ProcessData {
  id: string;
  brandId: string;
  type: string;
  calendarRule: CalendarRule;
  minStaffDefault: number;
}

export interface AssignmentData {
  id: string;
  employeeId: string;
  processId: string;
  isPrimary: boolean;
}

export interface CoverageOverrideData {
  id?: string;
  processId: string;
  date?: string | null; // YYYY-MM-DD
  weekday?: number | null; // 0-6
  minStaff: number;
}

export interface HolidayData {
  id?: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface LeaveData {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: LeaveType;
  status: LeaveStatus;
}

export interface RosterEntryData {
  id?: string;
  rosterId?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: EntryStatus;
  locked: boolean;
  source: EntrySource;
}

export interface Issue {
  id: string;
  severity: IssueSeverity;
  type: IssueType;
  brandId?: string;
  processId?: string;
  date?: string;
  employeeIds: string[];
  message: string;
  suggestions: string[];
}

export interface EngineInput {
  month: string; // YYYY-MM
  pods: PodData[];
  employees: EmployeeData[];
  brands: BrandData[];
  processes: ProcessData[];
  assignments: AssignmentData[];
  coverageOverrides: CoverageOverrideData[];
  holidays: HolidayData[];
  leaves: LeaveData[];
  existingEntries?: RosterEntryData[];
  preserveManualEdits?: boolean;
}

export interface CompOffCredit {
  employeeId: string;
  date: string;
  processId: string;
  reason: string;
}

export interface GenerationResult {
  month: string;
  entries: RosterEntryData[];
  issues: Issue[];
  compOffCredits: CompOffCredit[];
  isValid: boolean;
}

export interface ReplacementCandidate {
  employeeId: string;
  name: string;
  podName: string;
  isSamePod: boolean;
  isAlreadyAssigned: boolean;
  consecutiveDays: number;
  score: number;
  reason: string;
}
