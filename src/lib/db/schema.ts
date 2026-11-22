import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const pods = sqliteTable("pods", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  leadEmployeeId: text("lead_employee_id"),
});

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  podId: text("pod_id")
    .notNull()
    .references(() => pods.id, { onDelete: "restrict" }),
  role: text("role").notNull().default("Operations Associate"),
  isPodLead: integer("is_pod_lead", { mode: "boolean" }).notNull().default(false),
  preferredWeeklyOffDays: text("preferred_weekly_off_days").notNull().default("[]"), // JSON string array of numbers 0-6 (0=Sun)
  maxConsecutiveWorkingDays: integer("max_consecutive_working_days").notNull().default(6),
  weeklyOffsPerWeek: integer("weekly_offs_per_week").notNull().default(1),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const brands = sqliteTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const processes = sqliteTable("processes", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'Customer Support' | 'Abandoned Cart' | 'Retention' | 'NDR' | etc.
  calendarRule: text("calendar_rule").notNull().default("EXCEPT_SUNDAYS_AND_HOLIDAYS"), // 'ALL_365' | 'ALL_EXCEPT_HOLIDAYS' | 'EXCEPT_SUNDAYS_AND_HOLIDAYS'
  minStaffDefault: integer("min_staff_default").notNull().default(1),
});

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  processId: text("process_id")
    .notNull()
    .references(() => processes.id, { onDelete: "cascade" }),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(true),
});

export const coverageOverrides = sqliteTable("coverage_overrides", {
  id: text("id").primaryKey(),
  processId: text("process_id")
    .notNull()
    .references(() => processes.id, { onDelete: "cascade" }),
  date: text("date"), // Specific date YYYY-MM-DD
  weekday: integer("weekday"), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  minStaff: integer("min_staff").notNull(),
});

export const holidays = sqliteTable("holidays", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  name: text("name").notNull(),
});

export const leaves = sqliteTable("leaves", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull().default("PLANNED"), // 'PLANNED' | 'COMP_OFF' | 'SICK'
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'APPROVED' | 'REJECTED'
});

export const rosters = sqliteTable("rosters", {
  id: text("id").primaryKey(),
  month: text("month").notNull(), // YYYY-MM
  status: text("status").notNull().default("DRAFT"), // 'DRAFT' | 'PUBLISHED'
  generatedAt: text("generated_at").notNull(),
  version: integer("version").notNull().default(1),
});

export const rosterEntries = sqliteTable("roster_entries", {
  id: text("id").primaryKey(),
  rosterId: text("roster_id")
    .notNull()
    .references(() => rosters.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("WORKING"), // 'WORKING' | 'WEEKLY_OFF' | 'LEAVE' | 'HOLIDAY' | 'COMP_OFF'
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  source: text("source").notNull().default("AUTO"), // 'AUTO' | 'MANUAL'
});

export const rosterChangeLogs = sqliteTable("roster_change_logs", {
  id: text("id").primaryKey(),
  rosterId: text("roster_id")
    .notNull()
    .references(() => rosters.id, { onDelete: "cascade" }),
  at: text("at").notNull(),
  actor: text("actor").notNull().default("Operations Manager"),
  description: text("description").notNull(),
  issuesBefore: text("issues_before").notNull().default("[]"), // Serialized JSON array of Issue
  issuesAfter: text("issues_after").notNull().default("[]"),   // Serialized JSON array of Issue
});

// Relations
export const podsRelations = relations(pods, ({ many, one }) => ({
  employees: many(employees),
  leadEmployee: one(employees, {
    fields: [pods.leadEmployeeId],
    references: [employees.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  pod: one(pods, {
    fields: [employees.podId],
    references: [pods.id],
  }),
  assignments: many(assignments),
  leaves: many(leaves),
  rosterEntries: many(rosterEntries),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  processes: many(processes),
}));

export const processesRelations = relations(processes, ({ one, many }) => ({
  brand: one(brands, {
    fields: [processes.brandId],
    references: [brands.id],
  }),
  assignments: many(assignments),
  coverageOverrides: many(coverageOverrides),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  employee: one(employees, {
    fields: [assignments.employeeId],
    references: [employees.id],
  }),
  process: one(processes, {
    fields: [assignments.processId],
    references: [processes.id],
  }),
}));

export const coverageOverridesRelations = relations(coverageOverrides, ({ one }) => ({
  process: one(processes, {
    fields: [coverageOverrides.processId],
    references: [processes.id],
  }),
}));

export const leavesRelations = relations(leaves, ({ one }) => ({
  employee: one(employees, {
    fields: [leaves.employeeId],
    references: [employees.id],
  }),
}));

export const rostersRelations = relations(rosters, ({ many }) => ({
  entries: many(rosterEntries),
  changeLogs: many(rosterChangeLogs),
}));

export const rosterEntriesRelations = relations(rosterEntries, ({ one }) => ({
  roster: one(rosters, {
    fields: [rosterEntries.rosterId],
    references: [rosters.id],
  }),
  employee: one(employees, {
    fields: [rosterEntries.employeeId],
    references: [employees.id],
  }),
}));

export const rosterChangeLogsRelations = relations(rosterChangeLogs, ({ one }) => ({
  roster: one(rosters, {
    fields: [rosterChangeLogs.rosterId],
    references: [rosters.id],
  }),
}));
