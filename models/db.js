const Database = require('better-sqlite3');
const path = require('path');
const { ADMIN_IDENTIFIER } = require('../config/auth');

const dbPath = path.resolve(__dirname, '../database.sqlite');

let rawDb;
try {
  rawDb = new Database(dbPath);
  rawDb.pragma('foreign_keys = ON');
  console.log('Connected to the SQLite database.');
} catch (err) {
  console.error(`Error opening database ${dbPath}: ${err.message}`);
  throw err;
}

const normalizeParams = (params) => {
  if (Array.isArray(params)) {
    return params;
  }

  if (params === undefined || params === null) {
    return [];
  }

  return [params];
};

const parseMethodArgs = (params, cb) => {
  if (typeof params === 'function') {
    return { params: [], cb: params };
  }

  return { params: normalizeParams(params), cb };
};

const asyncCallback = (fn) => {
  process.nextTick(fn);
};

const db = {
  get(sql, params, cb) {
    const parsed = parseMethodArgs(params, cb);

    try {
      const row = rawDb.prepare(sql).get(...parsed.params);
      if (parsed.cb) {
        asyncCallback(() => parsed.cb(null, row));
        return this;
      }
      return row;
    } catch (err) {
      if (parsed.cb) {
        asyncCallback(() => parsed.cb(err));
        return this;
      }
      throw err;
    }
  },

  all(sql, params, cb) {
    const parsed = parseMethodArgs(params, cb);

    try {
      const rows = rawDb.prepare(sql).all(...parsed.params);
      if (parsed.cb) {
        asyncCallback(() => parsed.cb(null, rows));
        return this;
      }
      return rows;
    } catch (err) {
      if (parsed.cb) {
        asyncCallback(() => parsed.cb(err));
        return this;
      }
      throw err;
    }
  },

  run(sql, params, cb) {
    const parsed = parseMethodArgs(params, cb);

    try {
      const info = rawDb.prepare(sql).run(...parsed.params);
      const context = {
        lastID: Number(info.lastInsertRowid || 0),
        changes: Number(info.changes || 0)
      };

      if (parsed.cb) {
        asyncCallback(() => parsed.cb.call(context, null));
        return this;
      }

      return context;
    } catch (err) {
      if (parsed.cb) {
        asyncCallback(() => parsed.cb.call({ lastID: 0, changes: 0 }, err));
        return this;
      }
      throw err;
    }
  }
};

const runAsync = (sql, params = []) =>
  Promise.resolve().then(() => db.run(sql, params));

const allAsync = (sql, params = []) =>
  Promise.resolve().then(() => db.all(sql, params));

const initializeDatabase = async () => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'student'
    )
  `);

  const userColumns = await allAsync('PRAGMA table_info(users)');
  const hasEmailColumn = userColumns.some((column) => column.name === 'email');
  const hasRoleColumn = userColumns.some((column) => column.name === 'role');
  const hasAvatarColumn = userColumns.some((column) => column.name === 'avatar_url');
  const hasFirstNameColumn = userColumns.some((column) => column.name === 'first_name');
  const hasLastNameColumn = userColumns.some((column) => column.name === 'last_name');
  const hasPreferredLanguageColumn = userColumns.some((column) => column.name === 'preferred_language');

  if (!hasEmailColumn) {
    await runAsync('ALTER TABLE users ADD COLUMN email TEXT');
    console.log('Added email column to users table.');
  }

  if (!hasRoleColumn) {
    await runAsync("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'");
    console.log('Added role column to users table.');
  }

  if (!hasAvatarColumn) {
    await runAsync('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    console.log('Added avatar_url column to users table.');
  }

  if (!hasFirstNameColumn) {
    await runAsync('ALTER TABLE users ADD COLUMN first_name TEXT');
    console.log('Added first_name column to users table.');
  }

  if (!hasLastNameColumn) {
    await runAsync('ALTER TABLE users ADD COLUMN last_name TEXT');
    console.log('Added last_name column to users table.');
  }

  if (!hasPreferredLanguageColumn) {
    await runAsync("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'");
    console.log('Added preferred_language column to users table.');
  }

  await runAsync(
    "UPDATE users SET preferred_language = 'en' WHERE preferred_language IS NULL OR trim(preferred_language) = ''"
  );
  await runAsync('UPDATE users SET preferred_language = lower(trim(preferred_language))');
  await runAsync(
    "UPDATE users SET preferred_language = 'en' WHERE preferred_language NOT IN ('en', 'lt', 'tr', 'lv', 'ru')"
  );

  await runAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL'
  );

  await runAsync('UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL');
  await runAsync('UPDATE users SET username = trim(username) WHERE username IS NOT NULL');
  await runAsync(
    "UPDATE users SET role = 'student' WHERE lower(COALESCE(email, '')) != ? AND lower(COALESCE(username, '')) != ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]
  );
  await runAsync(
    "UPDATE users SET role = 'admin' WHERE lower(COALESCE(email, '')) = ? OR lower(COALESCE(username, '')) = ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]
  );
  await runAsync(
    "UPDATE users SET email = NULL WHERE lower(COALESCE(email, '')) = ? AND lower(COALESCE(username, '')) != ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]
  );
  await runAsync(
    "UPDATE users SET email = ? WHERE (email IS NULL OR trim(email) = '') AND lower(COALESCE(username, '')) = ?",
    [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]
  );

  await runAsync(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      used_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await runAsync('CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)');
  await runAsync('CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON password_reset_tokens(expires_at)');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_by INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS notification_receipts (
      notification_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at INTEGER,
      deleted_at INTEGER,
      PRIMARY KEY (notification_id, user_id),
      FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await runAsync(
    'CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_visible ON notification_receipts(user_id, deleted_at, is_read)'
  );
  await runAsync('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      student_id TEXT UNIQUE NOT NULL,
      email TEXT,
      user_id INTEGER,
      group_name TEXT,
      data TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  const studentColumns = await allAsync('PRAGMA table_info(students)');
  const hasStudentUserIdColumn = studentColumns.some((column) => column.name === 'user_id');
  if (!hasStudentUserIdColumn) {
    await runAsync('ALTER TABLE students ADD COLUMN user_id INTEGER');
    console.log('Added user_id column to students table.');
  }

  await runAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id_unique ON students(user_id) WHERE user_id IS NOT NULL'
  );

  await runAsync(
    `INSERT OR IGNORE INTO students (name, surname, student_id, email, user_id, group_name, data)
     SELECT
       COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(trim(u.username), ''), 'Student') AS name,
       COALESCE(NULLIF(trim(u.last_name), ''), 'User') AS surname,
       ('REG-AUTO-' || u.id) AS student_id,
       u.email,
       u.id,
       NULL,
       NULL
     FROM users u
     LEFT JOIN students s ON lower(COALESCE(s.email, '')) = lower(COALESCE(u.email, ''))
     WHERE u.email IS NOT NULL
       AND trim(u.email) != ''
       AND lower(u.email) != ?
       AND s.id IS NULL`,
    [ADMIN_IDENTIFIER]
  );

  await runAsync(
    `UPDATE students
     SET user_id = (
       SELECT u.id FROM users u
       WHERE lower(COALESCE(u.email, '')) = lower(COALESCE(students.email, ''))
       LIMIT 1
     )
     WHERE user_id IS NULL
       AND email IS NOT NULL
       AND trim(email) != ''`
  );
};

db.ready = initializeDatabase().catch((err) => {
  console.error('Database initialization failed:', err.message);
  throw err;
});

module.exports = db;
