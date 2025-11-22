import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'inventory.db');

if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_FILE, (err) => {
  if (err) console.error('DB open error', err);
  else console.log('Connected to SQLite DB at', DB_FILE);
});

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    unit TEXT,
    category TEXT,
    brand TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    old_stock INTEGER,
    new_stock INTEGER,
    changed_by TEXT,
    timestamp TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
});

export default db;
