import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type AppDb = ReturnType<typeof drizzlePglite<typeof schema>> | ReturnType<typeof drizzlePostgres<typeof schema>>;

type DatabaseClient = {
  db: AppDb;
  driver: "pglite" | "postgres";
  executeRaw: (query: string) => Promise<void>;
};

let databasePromise: Promise<DatabaseClient> | null = null;

async function createDatabaseClient(): Promise<DatabaseClient> {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const sql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
    });

    return {
      db: drizzlePostgres(sql, { schema }),
      driver: "postgres",
      executeRaw: async (query: string) => {
        await sql.unsafe(query);
      },
    };
  }

  const pglite = new PGlite();

  return {
    db: drizzlePglite(pglite, { schema }),
    driver: "pglite",
    executeRaw: async (query: string) => {
      await pglite.exec(query);
    },
  };
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabaseClient();
  }

  return databasePromise;
}
