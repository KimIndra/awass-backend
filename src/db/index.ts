import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

// Warn but don't crash if DATABASE_URL is not set during module load
if (!connectionString) {
    console.warn("⚠️ DATABASE_URL is not defined. Database operations will fail.");
}

// Create client only if connectionString exists
const client = connectionString ? postgres(connectionString) : null;

export const db = client ? drizzle(client, { schema }) : null as any;

export type Database = typeof db;
