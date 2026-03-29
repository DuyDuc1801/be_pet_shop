const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cartControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', ctrl.getCart);
router.post('/add', ctrl.addItem);
router.put('/item/:productId', ctrl.updateItem);
router.delete('/item/:productId', ctrl.removeItem);
router.delete('/clear', ctrl.clearCart);

module.exports = router;