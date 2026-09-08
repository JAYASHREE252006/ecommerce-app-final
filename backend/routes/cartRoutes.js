const express = require('express');
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getCart);
router.post('/', addToCart);
router.delete('/:productId', removeFromCart);

module.exports = router;
