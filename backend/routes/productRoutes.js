const express = require('express');
const { listProducts, getProduct } = require('../controllers/productController');
const { recordView } = require('../controllers/recentlyViewedController');
const { getTrending } = require('../controllers/recommendationController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
// IMPORTANT: specific string routes must come before the '/:productId'
// catch-all, or Express will try to treat "trending" as a productId.
router.get('/trending', getTrending);
router.get('/:productId', getProduct);

// Works for both guests and authenticated users. optionalAuth attaches
// req.userId only when a valid token is present; guests still get a 200.
router.post('/:productId/view', optionalAuth, recordView);

module.exports = router;
