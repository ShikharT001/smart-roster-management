import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const rawUrl = process.env.DATABASE_URL?.trim();
const url = rawUrl || "file:./data/roster.db";
const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

export const client = createClient({
  url,
  authToken: authToken || undefined,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
