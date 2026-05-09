const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'users',    required: true },
    doctor:    { type: mongoose.Schema.Types.ObjectId, ref: 'doctors',  required: true },
    service:   { type: mongoose.Schema.Types.ObjectId, ref: 'services', required: true },

    date:      { type: String, required: true },
    time:      { type: String, required: true },

    petName:   { type: String, required: true },
    petType:   { type: String, default: 'Chó' },
    petAge:    { type: String, default: '' },
    petWeight: { type: String, default: '' },
    note:      { type: String, default: '' },

    // ── Trạng thái lịch hẹn ──────────────────────────────────────
    // Flow mới: Pending → Confirmed → CheckedIn → InProgress → Completed / Cancelled
    status: {
        type:    String,
        enum:    ['Pending', 'Confirmed', 'CheckedIn', 'InProgress', 'Completed', 'Cancelled'],
        default: 'Pending',
    },

    // ── Check-in ─────────────────────────────────────────────────
    checkedInAt:  { type: Date,   default: null },   // Thời điểm khách hàng bấm xác nhận đã đến
    checkedInBy:  { type: String, default: 'customer' }, // 'customer' | 'staff'

    // ── Thông tin bổ sung ─────────────────────────────────────────
    adminNote:    { type: String, default: '' },
    cancelReason: { type: String, default: '' },

    // ── Thanh toán VNPay ─────────────────────────────────────────
    paymentStatus: {
        type:    String,
        enum:    ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
        default: 'unpaid',
    },
    depositAmount: { type: Number, default: 0 },
    vnpTxnRef:     { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);