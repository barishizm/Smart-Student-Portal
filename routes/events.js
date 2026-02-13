const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { getEffectiveRole } = require('../config/auth');

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
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
router.use(isAdmin);

router.post('/admin', eventController.createEvent);
router.post('/admin/:id/delete', eventController.deleteEvent);

module.exports = router;
