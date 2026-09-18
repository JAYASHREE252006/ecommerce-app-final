const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  saveForLater,
  moveToCart,
  validateCart,
} = require('../controllers/cartController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getCart);
router.get('/validate', validateCart);
router.post('/items', addToCart);
router.patch('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.post('/items/:itemId/save-for-later', saveForLater);
router.post('/items/:itemId/move-to-cart', moveToCart);

module.exports = router;
