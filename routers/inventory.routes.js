// ── inventory.routes.js ──────────────────────────────────────────
const express = require('express');
const r2 = express.Router();
const invCtrl = require('../controllers/stockImportControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

const guard = [verifyToken, requireRole(['Admin','Staff'])];

r2.get('/', ...guard, invCtrl.getAll);
r2.get('/:id', ...guard, invCtrl.getOne);
r2.post('/', ...guard, invCtrl.create);
r2.put('/:id/payment', ...guard, invCtrl.updatePayment);
r2.delete('/:id', ...guard, invCtrl.remove);

module.exports = r2;