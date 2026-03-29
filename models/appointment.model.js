const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    // Người đặt
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },

    // Bác sĩ & Dịch vụ
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'doctors',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'services',
        required: true
    },

    //Thời gian
    date: { type: String, required: true },  // "2025-03-15"
    time: { type: String, required: true },  // "09:00"

    //Thông tin thú cưng
    petName:    { type: String, required: true },
    petType:    { type: String, enum: ['Chó', 'Mèo', 'Khác'], default: 'Chó' },
    petAge:     { type: String, default: '' },  // "2 tuổi"
    petWeight:  { type: String, default: '' },  // "5kg"

    // Ghi chú
    note: { type: String, default: '' },

    // Trạng thái
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending'
    },

    // Admin ghi chú 
    adminNote: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('appointments', appointmentSchema);