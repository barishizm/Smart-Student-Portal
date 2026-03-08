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

router.get('/', (req, res) => res.render('career/index', { user: req.session.user }));
router.get('/advice', (req, res) => res.render('career/advice', { user: req.session.user }));
router.get('/internship-consultation', (req, res) => res.render('career/internship-consultation', { user: req.session.user }));
router.get('/days', (req, res) => res.render('career/days', { user: req.session.user }));
router.get('/jobs', (req, res) => res.render('career/jobs', { user: req.session.user }));
router.get('/internship-offers', (req, res) => res.render('career/internship-offers', { user: req.session.user }));

module.exports = router;
