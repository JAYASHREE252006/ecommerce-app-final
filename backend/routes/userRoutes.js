const express = require('express');
const {
  getRecentlyViewed,
  syncRecentlyViewed,
  getContinueShopping,
} = require('../controllers/recentlyViewedController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/recently-viewed', requireAuth, getRecentlyViewed);
router.post('/recently-viewed/sync', requireAuth, syncRecentlyViewed);
router.get('/continue-shopping', requireAuth, getContinueShopping);

module.exports = router;
