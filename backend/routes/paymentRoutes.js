const express = require('express');
const { handleWebhook } = require('../controllers/paymentController');

const router = express.Router();

// No auth middleware here - this is called by the payment provider's
// servers, not a logged-in user. Security comes from signature
// verification inside handleWebhook, not from a session/token.
router.post('/webhook', handleWebhook);

module.exports = router;
