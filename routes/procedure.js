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

router.get('/ethics', (req, res) => res.render('procedure/ethics', { user: req.session.user }));
router.get('/timetable', (req, res) => res.render('procedure/timetable', { user: req.session.user }));
router.get('/tests', (req, res) => res.render('procedure/tests', { user: req.session.user }));
router.get('/exam-session', (req, res) => res.render('procedure/exam-session', { user: req.session.user }));
router.get('/adjustment', (req, res) => res.render('procedure/adjustment', { user: req.session.user }));
router.get('/grading', (req, res) => res.render('procedure/grading', { user: req.session.user }));
router.get('/scholarships', (req, res) => res.render('procedure/scholarships', { user: req.session.user }));
router.get('/final-works', (req, res) => res.render('procedure/final-works', { user: req.session.user }));

module.exports = router;
