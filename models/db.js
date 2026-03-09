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

const run = (sql, params = []) => rawDb.prepare(sql).run(...(Array.isArray(params) ? params : [params]));
const all = (sql, params = []) => rawDb.prepare(sql).all(...(Array.isArray(params) ? params : [params]));
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const assertValidIdentifier = (value, label) => {
  if (!VALID_IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
};

const hasColumn = (table, column) => {
  assertValidIdentifier(table, 'table name');
  return all(`PRAGMA table_info(${table})`).some((c) => c.name === column);
};

const addColumnIfMissing = (table, column, type) => {
  assertValidIdentifier(table, 'table name');
  assertValidIdentifier(column, 'column name');
  if (!hasColumn(table, column)) {
    run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`Added ${column} column to ${table} table.`);
  }
};

const initializeDatabase = () => {
  // Schema creation (DDL cannot be inside transactions, but CREATE IF NOT EXISTS is safe)
  run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'student'
  )`);

  // User table migrations
  addColumnIfMissing('users', 'email', 'TEXT');
  addColumnIfMissing('users', 'role', "TEXT DEFAULT 'student'");
  addColumnIfMissing('users', 'avatar_url', 'TEXT');
  addColumnIfMissing('users', 'first_name', 'TEXT');
  addColumnIfMissing('users', 'last_name', 'TEXT');
  addColumnIfMissing('users', 'preferred_language', "TEXT DEFAULT 'en'");

  // Events table (must exist before notifications due to FK)
  run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    details TEXT,
    starts_at INTEGER NOT NULL,
    created_by INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  )`);

  run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_id INTEGER,
    created_by INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  )`);
  addColumnIfMissing('notifications', 'event_id', 'INTEGER');

  run(`CREATE TABLE IF NOT EXISTS notification_receipts (
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at INTEGER,
    deleted_at INTEGER,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    used_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject TEXT NOT NULL,
    classroom TEXT,
    lecturer TEXT,
    lecture_type TEXT,
    week_pattern TEXT NOT NULL DEFAULT 'all',
    created_by INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK(day_of_week BETWEEN 1 AND 7),
    CHECK(week_pattern IN ('all', 'week1', 'week2'))
  )`);
  addColumnIfMissing('schedules', 'group_name', 'TEXT');

  run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    email TEXT,
    user_id INTEGER,
    group_name TEXT,
    program_department TEXT,
    year_of_study INTEGER,
    status TEXT DEFAULT 'Active',
    data TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK(status IN ('Active', 'Inactive'))
  )`);

  // Student table migrations
  addColumnIfMissing('students', 'user_id', 'INTEGER');
  addColumnIfMissing('students', 'full_name', 'TEXT');
  addColumnIfMissing('students', 'program_department', 'TEXT');
  addColumnIfMissing('students', 'year_of_study', 'INTEGER');
  addColumnIfMissing('students', 'status', "TEXT DEFAULT 'Active'");

  run(`CREATE TABLE IF NOT EXISTS account_deletion_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    deleted_user_id INTEGER,
    deleted_at INTEGER NOT NULL,
    lock_note TEXT
  )`);

  run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);

  // All indexes in one batch
  run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL');
  run('CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)');
  run('CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON password_reset_tokens(expires_at)');
  run('CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_visible ON notification_receipts(user_id, deleted_at, is_read)');
  run('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)');
  run('CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_id_unique ON notifications(event_id) WHERE event_id IS NOT NULL');
  run('CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at ASC)');
  run('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC)');
  run('CREATE INDEX IF NOT EXISTS idx_schedules_day_time ON schedules(day_of_week, start_time)');
  run('CREATE INDEX IF NOT EXISTS idx_schedules_week_pattern ON schedules(week_pattern)');
  run('CREATE INDEX IF NOT EXISTS idx_schedules_group_name ON schedules(group_name)');
  run('CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_locks_email_unique ON account_deletion_locks(lower(email))');
  run('CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id_unique ON students(user_id) WHERE user_id IS NOT NULL');
  run('CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC)');
  run('CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON contact_messages(user_id)');

  // Data migrations wrapped in a single transaction for performance
  const migrateData = rawDb.transaction(() => {
    // User data normalization
    run("UPDATE users SET preferred_language = 'en' WHERE preferred_language IS NULL OR trim(preferred_language) = ''");
    run('UPDATE users SET preferred_language = lower(trim(preferred_language))');
    run("UPDATE users SET preferred_language = 'en' WHERE preferred_language NOT IN ('en', 'lt', 'tr', 'lv', 'ru')");
    run('UPDATE users SET email = lower(trim(email)) WHERE email IS NOT NULL');
    run('UPDATE users SET username = trim(username) WHERE username IS NOT NULL');

    // Admin role enforcement
    run("UPDATE users SET role = 'student' WHERE lower(COALESCE(email, '')) != ? AND lower(COALESCE(username, '')) != ?",
      [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]);
    run("UPDATE users SET role = 'admin' WHERE lower(COALESCE(email, '')) = ? OR lower(COALESCE(username, '')) = ?",
      [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]);
    run("UPDATE users SET email = NULL WHERE lower(COALESCE(email, '')) = ? AND lower(COALESCE(username, '')) != ?",
      [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]);
    run("UPDATE users SET email = ? WHERE (email IS NULL OR trim(email) = '') AND lower(COALESCE(username, '')) = ?",
      [ADMIN_IDENTIFIER, ADMIN_IDENTIFIER]);

    // Schedule data normalization
    run("UPDATE schedules SET group_name = 'general' WHERE group_name IS NULL OR trim(group_name) = ''");

    // Student data normalization
    run(`UPDATE students SET full_name = trim(COALESCE(name, '') || ' ' || COALESCE(surname, ''))
         WHERE full_name IS NULL OR trim(full_name) = ''`);
    run("UPDATE students SET status = 'Active' WHERE status IS NULL OR trim(status) = ''");
    run(`UPDATE students SET status = CASE
           WHEN lower(trim(status)) = 'inactive' THEN 'Inactive'
           ELSE 'Active'
         END`);

    // Auto-create student records for users without one
    run(`INSERT OR IGNORE INTO students (full_name, name, surname, student_id, email, user_id, group_name, program_department, year_of_study, status, data)
         SELECT
           trim(COALESCE(NULLIF(trim(u.first_name), ''), 'Student') || ' ' || COALESCE(NULLIF(trim(u.last_name), ''), 'User')),
           COALESCE(NULLIF(trim(u.first_name), ''), NULLIF(trim(u.username), ''), 'Student'),
           COALESCE(NULLIF(trim(u.last_name), ''), 'User'),
           ('REG-AUTO-' || u.id),
           u.email, u.id, NULL, NULL, NULL, 'Active', NULL
         FROM users u
         LEFT JOIN students s ON lower(COALESCE(s.email, '')) = lower(COALESCE(u.email, ''))
         WHERE u.email IS NOT NULL AND trim(u.email) != '' AND lower(u.email) != ? AND s.id IS NULL`,
      [ADMIN_IDENTIFIER]);

    // Link students to users
    run(`UPDATE students SET user_id = (
           SELECT u.id FROM users u
           WHERE lower(COALESCE(u.email, '')) = lower(COALESCE(students.email, ''))
           LIMIT 1
         )
         WHERE user_id IS NULL AND email IS NOT NULL AND trim(email) != ''`);

    // Backfill event notifications
    run(`INSERT OR IGNORE INTO notifications (title, message, event_id, created_by, created_at)
         SELECT
           'Upcoming event: ' || e.title,
           CASE WHEN e.details IS NULL OR trim(e.details) = ''
             THEN 'Event time: ' || strftime('%Y-%m-%d %H:%M', e.starts_at / 1000, 'unixepoch')
             ELSE e.details || char(10) || char(10) || 'Event time: ' || strftime('%Y-%m-%d %H:%M', e.starts_at / 1000, 'unixepoch')
           END,
           e.id, e.created_by, e.created_at
         FROM events e
         LEFT JOIN notifications n ON n.event_id = e.id
         WHERE n.id IS NULL`);

    run(`INSERT OR IGNORE INTO notification_receipts (notification_id, user_id, is_read)
         SELECT n.id, u.id, 0
         FROM notifications n
         CROSS JOIN users u
         LEFT JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = u.id
         WHERE n.event_id IS NOT NULL AND nr.notification_id IS NULL`);
  });

  migrateData();

  // Triggers (outside transaction)
  run('DROP TRIGGER IF EXISTS trg_events_auto_notify');
  run(`CREATE TRIGGER IF NOT EXISTS trg_events_auto_notify
    AFTER INSERT ON events
    BEGIN
      INSERT OR IGNORE INTO notifications (title, message, event_id, created_by, created_at)
      VALUES (
        'Upcoming event: ' || NEW.title,
        CASE WHEN NEW.details IS NULL OR trim(NEW.details) = ''
          THEN 'Event time: ' || strftime('%Y-%m-%d %H:%M', NEW.starts_at / 1000, 'unixepoch')
          ELSE NEW.details || char(10) || char(10) || 'Event time: ' || strftime('%Y-%m-%d %H:%M', NEW.starts_at / 1000, 'unixepoch')
        END,
        NEW.id, NEW.created_by, NEW.created_at
      );
      INSERT OR IGNORE INTO notification_receipts (notification_id, user_id, is_read)
      SELECT n.id, u.id, 0
      FROM users u
      INNER JOIN notifications n ON n.event_id = NEW.id;
    END`);

  run('DROP TRIGGER IF EXISTS trg_students_status_validate_insert');
  run('DROP TRIGGER IF EXISTS trg_students_status_validate_update');
  run(`CREATE TRIGGER IF NOT EXISTS trg_students_status_validate_insert
    BEFORE INSERT ON students FOR EACH ROW
    WHEN NEW.status IS NOT NULL AND NEW.status NOT IN ('Active', 'Inactive')
    BEGIN SELECT RAISE(ABORT, 'Invalid students.status value'); END`);
  run(`CREATE TRIGGER IF NOT EXISTS trg_students_status_validate_update
    BEFORE UPDATE OF status ON students FOR EACH ROW
    WHEN NEW.status IS NOT NULL AND NEW.status NOT IN ('Active', 'Inactive')
    BEGIN SELECT RAISE(ABORT, 'Invalid students.status value'); END`);
};

db.ready = Promise.resolve().then(() => {
  try {
    initializeDatabase();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    throw err;
  }
});

module.exports = db;
