import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cheffle.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  // Users table
  db.exec(`
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

  // Migrate existing users table: add new columns if missing
  try {
    db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN dietary_preferences TEXT`);
  } catch {
    // Column already exists
  }

  // Recipes table
  db.exec(`
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

  // Migrate existing recipes table: add source_url if missing
  try {
    db.exec(`ALTER TABLE recipes ADD COLUMN source_url TEXT`);
  } catch {
    // Column already exists
  }

  // Drop deprecated tables (ignore errors if they don't exist)
  db.exec(`DROP TABLE IF EXISTS recipe_tags`);
  db.exec(`DROP TABLE IF EXISTS meal_plans`);
  db.exec(`DROP TABLE IF EXISTS ingredient_lists`);
  db.exec(`DROP TABLE IF EXISTS tags`);
}

// Initialize on import
initDatabase();

export default db;
