const express = require('express');
const {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  reorder,
  downloadInvoice,
} = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:orderId', getOrder);
router.patch('/:orderId/status', updateOrderStatus);
router.patch('/:orderId/cancel', cancelOrder);
router.patch('/:orderId/return', requestReturn);
router.post('/:orderId/reorder', reorder);
router.get('/:orderId/invoice', downloadInvoice);

module.exports = router;
