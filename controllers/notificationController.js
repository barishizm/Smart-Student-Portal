const db = require('../models/db');
const { getEffectiveRole } = require('../config/auth');

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });

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

const parseNotificationId = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getUnreadCount = async (userId) => {
  const row = await dbGet(
    `SELECT COUNT(*) AS unread_count
     FROM notification_receipts
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND is_read = 0`,
    [userId],
  );

  return row?.unread_count || 0;
};

exports.listUserNotifications = async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.id;

  try {
    const notifications = await dbAll(
      `SELECT n.id, n.title, n.message, n.created_at, nr.is_read
       FROM notification_receipts nr
       INNER JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ?
         AND nr.deleted_at IS NULL
       ORDER BY n.created_at DESC
       LIMIT 40`,
      [userId],
    );

    const unreadCount = await getUnreadCount(userId);
    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('List notifications error:', err);
    return res.status(500).json({ error: 'Could not load notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const notificationId = parseNotificationId(req.params.id);
  if (!notificationId) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  try {
    const result = await dbRun(
      `UPDATE notification_receipts
       SET is_read = 1,
           read_at = CASE WHEN read_at IS NULL THEN ? ELSE read_at END
       WHERE notification_id = ?
         AND user_id = ?
         AND deleted_at IS NULL`,
      [Date.now(), notificationId, userId],
    );

    if (!result.changes) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const unreadCount = await getUnreadCount(userId);
    return res.json({ success: true, unreadCount });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ error: 'Could not mark notification as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const notificationId = parseNotificationId(req.params.id);
  if (!notificationId) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }

  try {
    const result = await dbRun(
      `UPDATE notification_receipts
       SET deleted_at = ?
       WHERE notification_id = ?
         AND user_id = ?
         AND deleted_at IS NULL`,
      [Date.now(), notificationId, userId],
    );

    if (!result.changes) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const unreadCount = await getUnreadCount(userId);
    return res.json({ success: true, unreadCount });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: 'Could not delete notification' });
  }
};

exports.broadcastNotification = async (req, res) => {
  if (!req.session?.user?.id) {
    req.flash('error_msg', 'Please log in first');
    return res.redirect('/');
  }

  if (getEffectiveRole(req.session.user) !== 'admin') {
    req.flash('error_msg', 'You are not authorized to send notifications');
    return res.redirect('/dashboard');
  }

  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();

  if (!title || !message) {
    req.flash('error_msg', 'Notification title and message are required');
    return res.redirect('/dashboard');
  }

  if (title.length > 120 || message.length > 1200) {
    req.flash('error_msg', 'Notification title or message exceeds allowed length');
    return res.redirect('/dashboard');
  }

  try {
    const now = Date.now();
    const created = await dbRun(
      'INSERT INTO notifications (title, message, created_by, created_at) VALUES (?, ?, ?, ?)',
      [title, message, req.session.user.id, now],
    );

    await dbRun(
      `INSERT OR IGNORE INTO notification_receipts (notification_id, user_id, is_read)
       SELECT ?, id, 0 FROM users`,
      [created.lastID],
    );

    req.flash('success_msg', 'Notification sent to all users');
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Broadcast notification error:', err);
    req.flash('error_msg', 'Could not send notification');
    return res.redirect('/dashboard');
  }
};