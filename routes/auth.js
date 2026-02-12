const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register Page
router.get('/register', authController.registerPage);

// Register Handle
router.post('/register', authController.register);

// Login Handle
router.post('/login', authController.login);

// Logout Handle
router.get('/logout', authController.logout);

module.exports = router;
