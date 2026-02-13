const db = require('../models/db');
const { getEffectiveRole } = require('../config/auth');

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });

const parseEventId = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseStartDateTime = (value) => {
  const input = String(value || '').trim();
  if (!input) return null;

  const parsed = new Date(input);
  const timestamp = parsed.getTime();
  if (Number.isNaN(timestamp)) return null;

  return timestamp;
};

exports.createEvent = async (req, res) => {
  if (!req.session?.user?.id) {
    req.flash('error_msg', 'Please log in first');
    return res.redirect('/');
  }

  if (getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to manage events');
    return res.redirect('/dashboard');
  }

  const title = (req.body.title || '').trim();
  const details = (req.body.details || '').trim();
  const startsAt = parseStartDateTime(req.body.starts_at);

  if (!title || !startsAt) {
    req.flash('error_msg', 'Event title and date are required');
    return res.redirect('/dashboard#manage-events');
  }

  if (title.length > 140 || details.length > 1200) {
    req.flash('error_msg', 'Event title or details exceed allowed length');
    return res.redirect('/dashboard#manage-events');
  }

  if (startsAt < Date.now() - 60 * 1000) {
    req.flash('error_msg', 'Event date must be in the future');
    return res.redirect('/dashboard#manage-events');
  }

  try {
    await dbRun(
      'INSERT INTO events (title, details, starts_at, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      [title, details || null, startsAt, req.session.user.id, Date.now()],
    );

    req.flash('success_msg', 'Event added successfully');
    return res.redirect('/dashboard#manage-events');
  } catch (err) {
    console.error('Create event error:', err);
    req.flash('error_msg', 'Could not add event');
    return res.redirect('/dashboard#manage-events');
  }
};

exports.deleteEvent = async (req, res) => {
  if (!req.session?.user?.id) {
    req.flash('error_msg', 'Please log in first');
    return res.redirect('/');
  }

  if (getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to manage events');
    return res.redirect('/dashboard');
  }

  const eventId = parseEventId(req.params.id);
  if (!eventId) {
    req.flash('error_msg', 'Invalid event id');
    return res.redirect('/dashboard#manage-events');
  }

  try {
    const result = await dbRun('DELETE FROM events WHERE id = ?', [eventId]);

    if (!result.changes) {
      req.flash('error_msg', 'Event not found');
      return res.redirect('/dashboard#manage-events');
    }

    req.flash('success_msg', 'Event removed successfully');
    return res.redirect('/dashboard#manage-events');
  } catch (err) {
    console.error('Delete event error:', err);
    req.flash('error_msg', 'Could not remove event');
    return res.redirect('/dashboard#manage-events');
  }
};
