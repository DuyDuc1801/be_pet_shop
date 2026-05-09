const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    doctor:  { type: mongoose.Schema.Types.ObjectId, ref: 'doctors', required: true },

    // Loại yêu cầu
    type: {
        type:    String,
        enum:    ['full_day', 'partial'],  // full_day = nghỉ cả ngày, partial = nghỉ một số slot
        required: true,
    },

    date:   { type: String, required: true },  // YYYY-MM-DD
    slots:  [{ type: String }],                // ['08:00','09:00'] — chỉ dùng khi type=partial
    reason: { type: String, required: true, minlength: 5 },

    // Trạng thái duyệt
    status: {
        type:    String,
        enum:    ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    adminNote:   { type: String, default: '' },  // Lý do từ chối / ghi chú admin
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    reviewedAt:  { type: Date, default: null },

}, { timestamps: true });

// Mỗi bác sĩ chỉ gửi 1 yêu cầu cho 1 ngày
leaveRequestSchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);