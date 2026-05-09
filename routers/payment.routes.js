const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

// Tạo URL thanh toán (cần đăng nhập)
router.post('/create-order',       verifyToken, ctrl.createOrderPayment);
router.post('/create-appointment', verifyToken, ctrl.createAppointmentPayment);

// VNPay callbacks (không cần auth — VNPay gọi)
router.get('/vnpay-return', ctrl.vnpayReturn);  // redirect về FE
router.get('/vnpay-ipn',    ctrl.vnpayIPN);     // server-to-server

module.exports = router;