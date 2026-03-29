const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/uploadControllers');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { uploadProduct, uploadAvatar, uploadDoctor } = require('../middlewares/upload.middleware');

// Avatar: user tự upload
router.post('/avatar',
    verifyToken,
    uploadAvatar,
    ctrl.uploadAvatar
);

// Product images: Admin only
router.post('/product/:id',
    verifyToken,
    requireRole(['Admin']),
    uploadProduct,
    ctrl.uploadProductImages
);

router.delete('/product/:id/image',
    verifyToken,
    requireRole(['Admin']),
    ctrl.deleteProductImage
);

//Doctor photo: Admin only
router.post('/doctor/:id',
    verifyToken,
    requireRole(['Admin']),
    uploadDoctor,
    ctrl.uploadDoctorPhoto
);

module.exports = router;