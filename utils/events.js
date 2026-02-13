const db = require('../models/db');

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const listUpcomingEvents = async ({ fromTimestamp = Date.now(), limit = 8 } = {}) => {
  const safeLimit = Math.min(50, parsePositiveInt(limit, 8));
  const safeFromTimestamp = Number.isFinite(Number(fromTimestamp)) ? Number(fromTimestamp) : Date.now();

  const rows = await dbAll(
    `SELECT id, title, details, starts_at, created_at
     FROM events
     WHERE starts_at >= ?
     ORDER BY starts_at ASC, id ASC
     LIMIT ?`,
    [safeFromTimestamp, safeLimit],
  );

  return rows || [];
};

const listPastEvents = async ({ beforeTimestamp = Date.now(), limit = 20 } = {}) => {
  const safeLimit = Math.min(100, parsePositiveInt(limit, 20));
  const safeBeforeTimestamp = Number.isFinite(Number(beforeTimestamp)) ? Number(beforeTimestamp) : Date.now();

  const rows = await dbAll(
    `SELECT id, title, details, starts_at, created_at
     FROM events
     WHERE starts_at < ?
     ORDER BY starts_at DESC, id DESC
     LIMIT ?`,
    [safeBeforeTimestamp, safeLimit],
  );

  return rows || [];
};

const cleanupExpiredEvents = async ({ olderThanDays = 30 } = {}) => {
  const safeDays = Math.max(1, parsePositiveInt(olderThanDays, 30));
  const thresholdTimestamp = Date.now() - (safeDays * 24 * 60 * 60 * 1000);

  const result = await dbRun(
    'DELETE FROM events WHERE starts_at < ?',
    [thresholdTimestamp],
  );

  return Number(result?.changes || 0);
};

module.exports = {
  listUpcomingEvents,
  listPastEvents,
  cleanupExpiredEvents,
};
