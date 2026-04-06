const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date:   { type: String, required: true },  // YYYY-MM-DD

    type:   {
        type:    String,
        enum:    ['working', 'dayoff'],
        default: 'working',
    },

    // Nếu type = 'working': các slot làm việc trong ngày
    slots: [{ type: String }],  // ['08:00', '09:00', ...]

    // Nếu type = 'dayoff': lý do nghỉ
    reason: { type: String, default: '' },

    note: { type: String, default: '' },
}, { timestamps: true });

// Mỗi bác sĩ chỉ có 1 schedule cho 1 ngày
doctorScheduleSchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);