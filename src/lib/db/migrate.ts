import { client } from "./client";

export async function migrate() {
  console.log("Running database migrations...");

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS pods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lead_employee_id TEXT
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pod_id TEXT NOT NULL REFERENCES pods(id) ON DELETE RESTRICT,
      role TEXT NOT NULL DEFAULT 'Operations Associate',
      is_pod_lead INTEGER NOT NULL DEFAULT 0,
      preferred_weekly_off_days TEXT NOT NULL DEFAULT '[]',
      max_consecutive_working_days INTEGER NOT NULL DEFAULT 6,
      weekly_offs_per_week INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS processes (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      calendar_rule TEXT NOT NULL DEFAULT 'EXCEPT_SUNDAYS_AND_HOLIDAYS',
      min_staff_default INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
      is_primary INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS coverage_overrides (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
      date TEXT,
      weekday INTEGER,
      min_staff INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'PLANNED',
      status TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS rosters (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      generated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS roster_entries (
      id TEXT PRIMARY KEY,
      roster_id TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'WORKING',
      locked INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'AUTO'
    );

    CREATE TABLE IF NOT EXISTS roster_change_logs (
      id TEXT PRIMARY KEY,
      roster_id TEXT NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
      at TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'Operations Manager',
      description TEXT NOT NULL,
      issues_before TEXT NOT NULL DEFAULT '[]',
      issues_after TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_emp ON assignments(employee_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_proc ON assignments(process_id);
    CREATE INDEX IF NOT EXISTS idx_leaves_emp_date ON leaves(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_roster_entries_lookup ON roster_entries(roster_id, employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_rosters_month ON rosters(month);
  `);

  console.log("Migrations applied successfully.");
}

// Allow direct execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("migrate.ts")) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
