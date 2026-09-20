const express = require('express');
const { register, login, me, updateThemePreference } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/theme', requireAuth, updateThemePreference);

module.exports = router;
