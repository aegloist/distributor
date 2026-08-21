import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

// Single connection for edge/runtime safety; Drizzle pools via postgres.js.
const client = postgres(databaseUrl, {
  max: 10,
  prepare: false,
  ssl: "prefer",
});

export const db = drizzle(client, { schema });
export { schema };
