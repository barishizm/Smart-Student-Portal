const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to view this resource');
    return res.redirect('/');
  }
  next();
};

router.use(requireAuth);

router.get('/requests', (req, res) => res.render('documents/requests', { user: req.session.user }));
router.get('/fees', (req, res) => res.render('documents/fees', { user: req.session.user }));
router.get('/certificates', (req, res) => res.render('documents/certificates', { user: req.session.user }));
router.get('/report-slip', (req, res) => res.render('documents/report-slip', { user: req.session.user }));
router.get('/approval', (req, res) => res.render('documents/approval', { user: req.session.user }));

module.exports = router;
