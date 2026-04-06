const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminStatsControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin', 'Staff'])];

router.get('/overview', ...guard, ctrl.getOverview);
router.get('/revenue-chart',...guard, ctrl.getRevenueChart);
router.get('/top-products', ...guard, ctrl.getTopProducts);
router.get('/category-revenue',...guard, ctrl.getCategoryRevenue);

module.exports = router;