const express = require('express');
const {
  registerToken,
  unregisterToken,
  getPreferences,
  updatePreferences,
  getHistory,
  broadcastPromotion,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/register-token', registerToken);
router.delete('/register-token', unregisterToken);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.get('/history', getHistory);
router.post('/broadcast', broadcastPromotion);

module.exports = router;
