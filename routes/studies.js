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

router.get('/semester', (req, res) => res.render('studies/semester', { user: req.session.user }));
router.get('/results', (req, res) => res.render('studies/results', { user: req.session.user }));
router.get('/thesis', (req, res) => res.render('studies/thesis', { user: req.session.user }));
router.get('/exams', (req, res) => res.render('studies/exams', { user: req.session.user }));
router.get('/programs', (req, res) => res.render('studies/programs', { user: req.session.user }));
router.get('/internships', (req, res) => res.render('studies/internships', { user: req.session.user }));
router.get('/auditorium', (req, res) => res.render('studies/auditorium', { user: req.session.user }));
router.get('/lecture-schedule', (req, res) => res.render('studies/lecture-schedule', { user: req.session.user }));
router.get('/consultations', (req, res) => res.render('studies/consultations', { user: req.session.user }));

module.exports = router;
