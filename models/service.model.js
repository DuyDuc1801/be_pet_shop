const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 30 }, // phút
    icon: { type: String, default: '🩺' },
    category: {
        type: String,
        category: {
            type: String,
            enum: [
                'Khám tổng quát',
                'Tiêm phòng',
                'Phẫu thuật',
                'Xét nghiệm',
                'Chăm sóc răng',
                'Tắm & Grooming',
                'Khác',
            ],
            default: 'Khác',
        },
        default: 'Khám bệnh'
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Service = mongoose.model('services', serviceSchema);
module.exports = Service;