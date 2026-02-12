const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { ADMIN_IDENTIFIER } = require("../config/auth");

const dbPath = path.resolve(__dirname, "../database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`Error opening database ${dbPath}: ${err.message}`);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const initializeDatabase = async () => {
  // Keep CREATE TABLE compatible with older schemas; enforce email uniqueness via index.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'student'
    )
  `);

  const userColumns = await allAsync("PRAGMA table_info(users)");
  const hasEmailColumn = userColumns.some((column) => column.name === "email");
  const hasRoleColumn = userColumns.some((column) => column.name === "role");

  if (!hasEmailColumn) {
    await runAsync("ALTER TABLE users ADD COLUMN email TEXT");
    console.log("Added email column to users table.");
  }

  if (!hasRoleColumn) {
    await runAsync("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'");
    console.log("Added role column to users table.");
  }

  await runAsync(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL",
  );

  await runAsync(
    "UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL",
  );
  await runAsync(
    "UPDATE users SET username = trim(username) WHERE username IS NOT NULL",
  );
  await runAsync(
    "UPDATE users SET role = 'student' WHERE lower(COALESCE(email, '')) != ? AND lower(COALESCE(username, '')) != ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER],
  );
  await runAsync(
    "UPDATE users SET role = 'admin' WHERE lower(COALESCE(email, '')) = ? OR lower(COALESCE(username, '')) = ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER],
  );
  await runAsync(
    "UPDATE users SET email = NULL WHERE lower(COALESCE(email, '')) = ? AND lower(COALESCE(username, '')) != ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER],
  );
  await runAsync(
    "UPDATE users SET email = ? WHERE (email IS NULL OR trim(email) = '') AND lower(COALESCE(username, '')) = ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER],
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      student_id TEXT UNIQUE NOT NULL,
      email TEXT,
      group_name TEXT,
      data TEXT
    )
  `);
};

db.ready = initializeDatabase().catch((err) => {
  console.error("Database initialization failed:", err.message);
  throw err;
});

module.exports = db;
