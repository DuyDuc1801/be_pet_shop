const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/aiControllers');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/diagnose',       verifyToken, ctrl.diagnose);
router.post('/chat',           verifyToken, ctrl.chat);
router.post('/analyze-image',  verifyToken, ctrl.analyzeImage);
router.post('/quick-advice',   verifyToken, ctrl.quickAdvice);
router.get('/pet-context',     verifyToken, ctrl.getPetContext);

module.exports = router;