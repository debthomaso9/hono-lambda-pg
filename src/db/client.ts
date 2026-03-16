import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, {
  max: 1
});

export const db = drizzle(client);

let initPromise: Promise<void> | null = null;

export async function ensureDatabaseReady() {
  if (!initPromise) {
    initPromise = client
      .unsafe(`
        create table if not exists github_profiles (
          id serial primary key,
          github_id integer not null,
          login text not null,
          avatar_url text not null,
          name text,
          public_repos integer not null,
          followers integer not null,
          following integer not null,
          created_at timestamp not null default now()
        )
      `)
      .then(() => undefined);
  }

  await initPromise;
}

export async function checkDatabaseHealth() {
  const result = await db.execute(sql`select 1 as ok`);
  return result;
}
