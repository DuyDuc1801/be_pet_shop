const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/aiControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

// Cần đăng nhập mới dùng được AI
router.post('/diagnose', verifyToken, ctrl.diagnose);
router.post('/chat', verifyToken, ctrl.chat);

module.exports = router;