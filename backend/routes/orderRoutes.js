const express = require('express');
const { createOrder, listOrders, updateOrderStatus } = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listOrders);
router.patch('/:orderId/status', updateOrderStatus);

module.exports = router;
