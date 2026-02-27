import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'database');
const isLocal =
  !process.env.TURSO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL.startsWith('file:');

if (isLocal && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(dbDir, 'cheffle.db')}`,
  authToken: isLocal ? undefined : process.env.TURSO_AUTH_TOKEN,
});

export interface DbRunResult {
  lastInsertRowid: number;
  changes: number;
}

async function runMigrations() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      dietary_preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const alterColumns = [
    'display_name',
    'dietary_preferences',
    'skill_level',
    'kitchen_context',
  ];
  for (const col of alterColumns) {
    try {
      await client.execute(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
    } catch {
      // Column already exists
    }
  }

  try {
    await client.execute(`ALTER TABLE users ADD COLUMN onboarding_complete INTEGER DEFAULT 1`);
  } catch {
    // Column already exists
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      prep_time INTEGER DEFAULT 0,
      cook_time INTEGER DEFAULT 0,
      source_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await client.execute(`ALTER TABLE recipes ADD COLUMN source_url TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await client.execute(`ALTER TABLE recipes ADD COLUMN skill_level_adjusted TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await client.execute(`ALTER TABLE recipes ADD COLUMN servings INTEGER`);
  } catch {
    // Column already exists
  }

  await client.execute('DROP TABLE IF EXISTS recipe_tags');
  await client.execute('DROP TABLE IF EXISTS meal_plans');
  await client.execute('DROP TABLE IF EXISTS ingredient_lists');
  await client.execute('DROP TABLE IF EXISTS tags');
}

let migrationsRun = false;

async function ensureMigrations() {
  if (!migrationsRun) {
    await runMigrations();
    migrationsRun = true;
  }
}

const db = {
  async get(sql: string, ...args: unknown[]): Promise<Record<string, unknown> | undefined> {
    await ensureMigrations();
    const result = await client.execute({ sql, args: args as (string | number | bigint | null)[] });
    return result.rows[0] as Record<string, unknown> | undefined;
  },

  async all(sql: string, ...args: unknown[]): Promise<Record<string, unknown>[]> {
    await ensureMigrations();
    const result = await client.execute({ sql, args: args as (string | number | bigint | null)[] });
    return result.rows as Record<string, unknown>[];
  },

  async run(sql: string, ...args: unknown[]): Promise<DbRunResult> {
    await ensureMigrations();
    const result = await client.execute({ sql, args: args as (string | number | bigint | null)[] });
    return {
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
      changes: result.rowsAffected ?? 0,
    };
  },

  async exec(sql: string): Promise<void> {
    await ensureMigrations();
    await client.execute(sql);
  },
};

export function initDatabase(): Promise<void> {
  return ensureMigrations();
}

export default db;
