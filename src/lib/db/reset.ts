import fs from "fs";
import path from "path";
import { client } from "./client";
import { migrate } from "./migrate";
import { seed } from "./seed";

export async function reset() {
  console.log("Resetting database...");

  const isLocalFile = (process.env.DATABASE_URL || "file:./data/roster.db").startsWith("file:");

  if (isLocalFile) {
    const dbPath = path.resolve(process.cwd(), "data/roster.db");
    const journalPath = `${dbPath}-journal`;
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch {
      // In case file is locked by open handle, drop tables via SQL
      await dropAllTables();
    }
  } else {
    await dropAllTables();
  }

  await migrate();
  await seed();
  console.log("Database reset complete.");
}

async function dropAllTables() {
  const tableNames = [
    "roster_change_logs",
    "roster_entries",
    "rosters",
    "leaves",
    "holidays",
    "coverage_overrides",
    "assignments",
    "processes",
    "brands",
    "employees",
    "pods",
  ];

  for (const table of tableNames) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${table};`);
    } catch (err) {
      console.warn(`Could not drop table ${table}:`, err);
    }
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("reset.ts")) {
  reset()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Reset failed:", err);
      process.exit(1);
    });
}
