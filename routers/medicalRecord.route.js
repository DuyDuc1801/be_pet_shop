const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecord.controller');

const { verifyToken, requireRole } = require('../middlewares/auth.middleware'); 

// ── BÁC SĨ TẠO BỆNH ÁN ───────────────────────────────────────
// POST /api/medical-records
// Yêu cầu: Đã đăng nhập VÀ tài khoản phải là Role: Doctor
router.post('/', verifyToken, requireRole(['Doctor']), medicalRecordController.createRecord);

// ── XEM LỊCH SỬ BỆNH ÁN CỦA THÚ CƯNG ─────────────────────────
// GET /api/medical-records/pet/:petId
// Yêu cầu: Đã đăng nhập (Cả Bác sĩ và Khách hàng đều có quyền xem)
router.get('/pet/:petName', verifyToken, medicalRecordController.getPetHistory);

module.exports = router;