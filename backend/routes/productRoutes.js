const express = require('express');
const { listProducts, getProduct, adminUpdateProduct } = require('../controllers/productController');
const { recordView } = require('../controllers/recentlyViewedController');
const { getTrending } = require('../controllers/recommendationController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
router.get('/trending', getTrending);
router.get('/:productId', getProduct);
router.post('/:productId/view', optionalAuth, recordView);
router.patch('/:productId/admin-update', requireAuth, adminUpdateProduct);

module.exports = router;
