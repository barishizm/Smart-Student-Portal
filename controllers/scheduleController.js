const db = require('../models/db');
const { getEffectiveRole } = require('../config/auth');

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows || []);
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row || null);
    });
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });

const parseScheduleId = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseDayOfWeek = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : null;
};

const normalizeWeekPattern = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'week1' || normalized === 'week2') {
    return normalized;
  }
  return 'all';
};

const normalizeTime = (value) => {
  const normalized = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return null;
  }
  return normalized;
};

const LECTURE_SLOTS = {
  1: { start: '08:30', end: '10:05' },
  2: { start: '10:20', end: '11:55' },
  3: { start: '12:10', end: '13:45' },
  4: { start: '14:30', end: '16:05' },
  5: { start: '16:20', end: '17:55' },
  6: { start: '18:10', end: '19:45' },
  7: { start: '19:55', end: '21:30' },
};

const parseLectureSlot = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && LECTURE_SLOTS[parsed] ? parsed : null;
};

const parsePage = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const getSafeReturnTo = (value) => {
  const candidate = String(value || '').trim();
  if (!candidate) return '/schedules/admin';
  if (candidate.startsWith('/schedules/admin') || candidate.startsWith('/dashboard')) {
    return candidate;
  }
  return '/schedules/admin';
};

const getSlotLabel = (entry, translate) => {
  const matched = Object.entries(LECTURE_SLOTS).find(([, slot]) => (
    slot.start === entry.start_time && slot.end === entry.end_time
  ));

  if (!matched) return `${entry.start_time} - ${entry.end_time}`;

  const slotNumber = matched[0];
  return translate(`schedules.slots.slot${slotNumber}`);
};

exports.renderScheduleAdminPage = async (req, res) => {
  if (!req.session?.user?.id || getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to access this resource');
    return res.redirect('/dashboard');
  }

  const selectedGroup = String(req.query.group_name || '').trim();
  const selectedDay = parseDayOfWeek(req.query.day_of_week) || null;
  const selectedWeekPattern = ['all', 'week1', 'week2'].includes(String(req.query.week_pattern || '').trim())
    ? String(req.query.week_pattern || '').trim()
    : '';
  const currentPage = parsePage(req.query.page);
  const pageSize = 10;

  try {
    const groups = await dbAll(
      `SELECT DISTINCT trim(group_name) AS group_name
       FROM students
       WHERE group_name IS NOT NULL AND trim(group_name) != ''
       ORDER BY trim(group_name) ASC`
    );

    const filters = [];
    const params = [];

    if (selectedGroup) {
      filters.push('trim(s.group_name) = ?');
      params.push(selectedGroup);
    }

    if (selectedDay) {
      filters.push('s.day_of_week = ?');
      params.push(selectedDay);
    }

    if (selectedWeekPattern) {
      filters.push('s.week_pattern = ?');
      params.push(selectedWeekPattern);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const totalRow = await dbGet(
      `SELECT COUNT(*) AS total
       FROM schedules s
       ${whereSql}`,
      params
    );

    const totalEntries = Number(totalRow?.total) || 0;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const offset = (safePage - 1) * pageSize;

    const scheduleEntries = await dbAll(
      `SELECT s.*
       FROM schedules s
       ${whereSql}
       ORDER BY trim(s.group_name) COLLATE NOCASE ASC, s.day_of_week ASC, s.start_time ASC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const formattedEntries = scheduleEntries.map((entry) => ({
      ...entry,
      slot_label: getSlotLabel(entry, res.locals.t),
    }));

    const hasActiveFilters = Boolean(selectedGroup || selectedDay || selectedWeekPattern);

    return res.render('schedules/admin', {
      user: req.session.user,
      scheduleEntries: formattedEntries,
      totalEntries,
      totalPages,
      currentPage: safePage,
      pageSize,
      hasActiveFilters,
      scheduleGroups: groups,
      filters: {
        group_name: selectedGroup,
        day_of_week: selectedDay,
        week_pattern: selectedWeekPattern,
      },
      returnTo: req.originalUrl || '/schedules/admin',
    });
  } catch (err) {
    console.error('Failed to render schedule admin page:', err);
    req.flash('error_msg', 'Could not load schedule management page');
    return res.redirect('/dashboard');
  }
};

exports.createSchedule = async (req, res) => {
  const returnTo = getSafeReturnTo(req.body.return_to);

  if (!req.session?.user?.id) {
    req.flash('error_msg', 'Please log in first');
    return res.redirect('/');
  }

  if (getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to manage schedules');
    return res.redirect(returnTo);
  }

  const dayOfWeek = parseDayOfWeek(req.body.day_of_week);
  const lectureSlot = parseLectureSlot(req.body.lecture_slot);
  const subject = (req.body.subject || '').trim();
  const groupName = (req.body.group_name || '').trim();
  const classroom = (req.body.classroom || '').trim();
  const lecturer = (req.body.lecturer || '').trim();
  const lectureType = (req.body.lecture_type || '').trim();
  const weekPattern = normalizeWeekPattern(req.body.week_pattern);
  const startTime = lectureSlot ? normalizeTime(LECTURE_SLOTS[lectureSlot].start) : null;
  const endTime = lectureSlot ? normalizeTime(LECTURE_SLOTS[lectureSlot].end) : null;

  if (!groupName || !dayOfWeek || !lectureSlot || !startTime || !endTime || !subject) {
    req.flash('error_msg', 'Group, day, lecture slot and subject are required');
    return res.redirect(returnTo);
  }

  if (startTime >= endTime) {
    req.flash('error_msg', 'End time must be after start time');
    return res.redirect(returnTo);
  }

  if (groupName.length > 80 || subject.length > 160 || classroom.length > 80 || lecturer.length > 120 || lectureType.length > 80) {
    req.flash('error_msg', 'One or more fields exceed allowed length');
    return res.redirect(returnTo);
  }

  try {
    await dbRun(
      `INSERT INTO schedules
      (group_name, day_of_week, start_time, end_time, subject, classroom, lecturer, lecture_type, week_pattern, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupName,
        dayOfWeek,
        startTime,
        endTime,
        subject,
        classroom || null,
        lecturer || null,
        lectureType || null,
        weekPattern,
        req.session.user.id,
        Date.now(),
      ]
    );

    req.flash('success_msg', 'Schedule entry added successfully');
    return res.redirect(returnTo);
  } catch (err) {
    console.error('Create schedule error:', err);
    req.flash('error_msg', 'Could not add schedule entry');
    return res.redirect(returnTo);
  }
};

exports.deleteSchedule = async (req, res) => {
  const returnTo = getSafeReturnTo(req.body.return_to);

  if (!req.session?.user?.id) {
    req.flash('error_msg', 'Please log in first');
    return res.redirect('/');
  }

  if (getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to manage schedules');
    return res.redirect(returnTo);
  }

  const scheduleId = parseScheduleId(req.params.id);
  if (!scheduleId) {
    req.flash('error_msg', 'Invalid schedule id');
    return res.redirect(returnTo);
  }

  try {
    const result = await dbRun('DELETE FROM schedules WHERE id = ?', [scheduleId]);

    if (!result.changes) {
      req.flash('error_msg', 'Schedule entry not found');
      return res.redirect(returnTo);
    }

    req.flash('success_msg', 'Schedule entry removed successfully');
    return res.redirect(returnTo);
  } catch (err) {
    console.error('Delete schedule error:', err);
    req.flash('error_msg', 'Could not remove schedule entry');
    return res.redirect(returnTo);
  }
};
