// ── review.routes.js ─────────────────────────────────────────────
const express  = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/doctor', verifyToken, ctrl.createDoctorReview);
router.post('/product', verifyToken, ctrl.createProductReview);
router.get('/doctor/:doctorId', ctrl.getDoctorReviews);
router.get('/product/:productId', ctrl.getProductReviews);
router.get('/can-review', verifyToken, ctrl.canReview);

module.exports = router;