CREATE TABLE IF NOT EXISTS user_state (
  user_id INTEGER PRIMARY KEY,
  transactions_json TEXT,
  budgets_json TEXT,
  bills_json TEXT,
  goals_json TEXT,
  settings_json TEXT,
  ui_json TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
