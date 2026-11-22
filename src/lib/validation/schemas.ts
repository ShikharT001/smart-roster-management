import { z } from "zod";

export const PodSchema = z.object({
  id: z.string().min(1, "Pod ID is required"),
  name: z.string().min(1, "Pod name is required"),
  leadEmployeeId: z.string().optional().nullable(),
});

export const EmployeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
  name: z.string().min(1, "Employee name is required"),
  podId: z.string().min(1, "Pod selection is required"),
  role: z.string().min(1, "Role is required"),
  isPodLead: z.boolean().default(false),
  preferredWeeklyOffDays: z.array(z.number().min(0).max(6)).default([0]),
  maxConsecutiveWorkingDays: z.number().int().min(1).max(14).default(6),
  weeklyOffsPerWeek: z.number().int().min(0).max(3).default(1),
  active: z.boolean().default(true),
});

export const BrandSchema = z.object({
  id: z.string().min(1, "Brand ID is required"),
  name: z.string().min(1, "Brand name is required"),
  active: z.boolean().default(true),
});

export const ProcessSchema = z.object({
  id: z.string().min(1, "Process ID is required"),
  brandId: z.string().min(1, "Brand selection is required"),
  type: z.string().min(1, "Process type is required"),
  calendarRule: z.enum(["ALL_365", "ALL_EXCEPT_HOLIDAYS", "EXCEPT_SUNDAYS_AND_HOLIDAYS"]),
  minStaffDefault: z.number().int().min(1, "Min staff must be at least 1").default(1),
});

export const AssignmentSchema = z.object({
  id: z.string().min(1, "Assignment ID is required"),
  employeeId: z.string().min(1, "Employee selection is required"),
  processId: z.string().min(1, "Process selection is required"),
  isPrimary: z.boolean().default(true),
});

export const CoverageOverrideSchema = z.object({
  id: z.string().min(1, "Override ID is required"),
  processId: z.string().min(1, "Process selection is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().nullable(),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  minStaff: z.number().int().min(0, "Min staff cannot be negative"),
});

export const HolidaySchema = z.object({
  id: z.string().min(1, "Holiday ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  name: z.string().min(1, "Holiday name is required"),
});

export const LeaveSchema = z.object({
  id: z.string().min(1, "Leave ID is required"),
  employeeId: z.string().min(1, "Employee selection is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  type: z.enum(["PLANNED", "COMP_OFF", "SICK"]),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

export type PodFormValues = z.infer<typeof PodSchema>;
export type EmployeeFormValues = z.infer<typeof EmployeeSchema>;
export type BrandFormValues = z.infer<typeof BrandSchema>;
export type ProcessFormValues = z.infer<typeof ProcessSchema>;
export type AssignmentFormValues = z.infer<typeof AssignmentSchema>;
export type CoverageOverrideFormValues = z.infer<typeof CoverageOverrideSchema>;
export type HolidayFormValues = z.infer<typeof HolidaySchema>;
export type LeaveFormValues = z.infer<typeof LeaveSchema>;
