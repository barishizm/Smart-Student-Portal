const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { getEffectiveRole } = require('../config/auth');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/');
};

const isAdmin = (req, res, next) => {
    if (!req.session.user || getEffectiveRole(req.session.user) !== 'admin') {
        req.flash('error_msg', 'You are not authorized to access this resource');
        return res.redirect('/dashboard');
    }
    return next();
};

router.use(isAuthenticated);
router.use(isAdmin);

// List
router.get('/', studentController.listStudents);

// Add
router.get('/new', studentController.newStudentForm);
router.post('/', studentController.createStudent);

// Edit
router.get('/:id/edit', studentController.editStudentForm);
router.post('/:id', studentController.updateStudent); // Using POST for update to keep simple, or use method-override for PUT

// Delete
router.post('/:id/delete', studentController.deleteStudent); // Using POST for delete

// XML Export
router.get('/xml', studentController.exportXML);

module.exports = router;
