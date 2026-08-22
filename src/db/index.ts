import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Lazy initialization: don't throw at build time when DATABASE_URL
// isn't available. Vercel + Neon inject it at runtime, not build time.
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  _client = postgres(databaseUrl, {
    max: 10,
    prepare: false,
    ssl: "prefer",
  });
  _db = drizzle(_client, { schema });
  return _db;
}

// Proxy that lazily creates the db on first access
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };
