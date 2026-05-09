const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    specialty: { type: String, default: 'Đa khoa' },
    degree: { type: String, default: '' },
    bio: { type: String, default: '' },
    photo: { type: String, default: '' },
    // Danh sách dịch vụ bác sĩ này thực hiện được
    services:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'services' }], 
    workSchedule: {
        monday: { type: [String], default: [] },
        tuesday: { type: [String], default: [] },
        wednesday: { type: [String], default: [] },
        thursday: { type: [String], default: [] },
        friday: { type: [String], default: [] },
        saturday: { type: [String], default: [] },
        sunday: { type: [String], default: [] },
    },
}, { timestamps: true });

module.exports = mongoose.model('doctors', doctorSchema);