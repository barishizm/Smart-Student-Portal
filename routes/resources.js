const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to view this resource');
    return res.redirect('/');
  }
  next();
};

router.get('/it-services', requireAuth, (req, res) => res.render('it-services', { user: req.session.user }));
router.get('/library', requireAuth, (req, res) => res.render('library', { user: req.session.user }));
router.get('/international', requireAuth, (req, res) => res.render('international', { user: req.session.user }));
router.get('/life', requireAuth, (req, res) => res.render('life', { user: req.session.user }));
router.get('/surveys', requireAuth, (req, res) => res.render('surveys', { user: req.session.user }));
router.get('/safety', requireAuth, (req, res) => res.render('safety', { user: req.session.user }));

module.exports = router;
