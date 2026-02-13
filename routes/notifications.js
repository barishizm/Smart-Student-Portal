const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { getEffectiveRole } = require('../config/auth');

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  if ((req.headers.accept || '').includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.flash('error_msg', 'Please log in to view this resource');
  return res.redirect('/');
};

const isAdmin = (req, res, next) => {
  if (req.session.user && getEffectiveRole(req.session.user) === 'admin') {
    return next();
  }

  req.flash('error_msg', 'You are not authorized to access this resource');
  return res.redirect('/dashboard');
};

router.use(isAuthenticated);

router.get('/', notificationController.listUserNotifications);
router.patch('/:id/read', notificationController.markNotificationRead);
router.delete('/:id', notificationController.deleteNotification);
router.post('/admin/broadcast', isAdmin, notificationController.broadcastNotification);

module.exports = router;