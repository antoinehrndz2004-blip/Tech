import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const dir = path.dirname(config.databasePath);
fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    wa_from       TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content       TEXT    NOT NULL,
    wa_message_id TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_messages_wa_from ON messages (wa_from, created_at);

  CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wa_from     TEXT    NOT NULL,
    full_name   TEXT    NOT NULL,
    email       TEXT,
    goal        TEXT,
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    wa_from         TEXT    NOT NULL,
    full_name       TEXT    NOT NULL,
    preferred_date  TEXT    NOT NULL,
    preferred_time  TEXT    NOT NULL,
    goal            TEXT,
    status          TEXT    DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS handoffs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wa_from     TEXT    NOT NULL,
    reason      TEXT    NOT NULL,
    summary     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS processed_wa_messages (
    wa_message_id TEXT PRIMARY KEY,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export type StoredRole = "user" | "assistant";

export function appendMessage(waFrom: string, role: StoredRole, content: string, waMessageId?: string): void {
  db.prepare(
    "INSERT INTO messages (wa_from, role, content, wa_message_id) VALUES (?, ?, ?, ?)",
  ).run(waFrom, role, content, waMessageId ?? null);
}

export function loadRecentMessages(waFrom: string, limit = 30): Array<{ role: StoredRole; content: string }> {
  const rows = db
    .prepare(
      `SELECT role, content FROM messages
       WHERE wa_from = ? AND role IN ('user', 'assistant')
       ORDER BY id DESC LIMIT ?`,
    )
    .all(waFrom, limit) as Array<{ role: StoredRole; content: string }>;
  return rows.reverse();
}

export function wasMessageProcessed(waMessageId: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM processed_wa_messages WHERE wa_message_id = ?")
    .get(waMessageId);
  return row !== undefined;
}

export function markMessageProcessed(waMessageId: string): void {
  db.prepare("INSERT OR IGNORE INTO processed_wa_messages (wa_message_id) VALUES (?)").run(waMessageId);
}

export function saveLead(lead: {
  waFrom: string;
  fullName: string;
  email?: string;
  goal?: string;
  notes?: string;
}): number {
  const info = db
    .prepare(
      "INSERT INTO leads (wa_from, full_name, email, goal, notes) VALUES (?, ?, ?, ?, ?)",
    )
    .run(lead.waFrom, lead.fullName, lead.email ?? null, lead.goal ?? null, lead.notes ?? null);
  return Number(info.lastInsertRowid);
}

export function saveBooking(b: {
  waFrom: string;
  fullName: string;
  preferredDate: string;
  preferredTime: string;
  goal?: string;
}): number {
  const info = db
    .prepare(
      `INSERT INTO bookings (wa_from, full_name, preferred_date, preferred_time, goal)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(b.waFrom, b.fullName, b.preferredDate, b.preferredTime, b.goal ?? null);
  return Number(info.lastInsertRowid);
}

export function saveHandoff(h: { waFrom: string; reason: string; summary?: string }): number {
  const info = db
    .prepare("INSERT INTO handoffs (wa_from, reason, summary) VALUES (?, ?, ?)")
    .run(h.waFrom, h.reason, h.summary ?? null);
  return Number(info.lastInsertRowid);
}
