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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    )
  `);

  // Recipe_Tags table (Many-to-Many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (recipe_id, tag_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Meal_Plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      recipe_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    )
  `);

  // Ingredient_Lists table (for saved shopping lists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredient_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ingredients TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

// Initialize default tags
export function initDefaultTags() {
  const defaultTags = [
    // Protein types
    { name: 'chicken', color: '#F59E0B' },
    { name: 'beef', color: '#DC2626' },
    { name: 'fish', color: '#3B82F6' },
    { name: 'vegetarian', color: '#10B981' },
    { name: 'vegan', color: '#059669' },
    { name: 'pork', color: '#EC4899' },
    // Difficulty levels
    { name: 'easy', color: '#10B981' },
    { name: 'medium', color: '#F59E0B' },
    { name: 'hard', color: '#EF4444' },
    // Cooking methods
    { name: 'slow cooker', color: '#8B5CF6' },
    { name: 'grill', color: '#F97316' },
    { name: 'stovetop', color: '#06B6D4' },
    { name: 'oven', color: '#EC4899' },
    { name: 'instant pot', color: '#6366F1' },
    // Cuisine types
    { name: 'italian', color: '#10B981' },
    { name: 'american', color: '#3B82F6' },
    { name: 'mediterranean', color: '#F59E0B' },
    { name: 'mexican', color: '#EF4444' },
    { name: 'asian', color: '#8B5CF6' },
    { name: 'french', color: '#EC4899' },
  ];

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
  const insertTags = db.transaction((tags: Array<{ name: string; color: string }>) => {
    for (const tag of tags) {
      insertTag.run(tag.name, tag.color);
    }
  });

  insertTags(defaultTags);
}

// Initialize on import
initDatabase();
initDefaultTags();

export default db;
