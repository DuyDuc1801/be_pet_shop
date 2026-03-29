const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orderControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// ── Customer routes ──────────────────────────────────────────────
router.post('/', verifyToken, ctrl.createOrder);
router.get('/my', verifyToken, ctrl.getMyOrders);
router.get('/my/:id', verifyToken, ctrl.getOrderDetail);
router.put('/my/:id/cancel',verifyToken, ctrl.cancelOrder);

module.exports = router;