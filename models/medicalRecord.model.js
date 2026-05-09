const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'appointments', required: true },
    pet:         { type: String, required: true },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'doctors', required: true },
    
    // Thông tin lâm sàng
    weight:      { type: Number }, // Cân nặng tại thời điểm khám
    temperature: { type: Number }, // Nhiệt độ
    symptoms:    { type: String, required: true }, // Triệu chứng bác sĩ ghi nhận
    diagnosis:   { type: String, required: true }, // Chẩn đoán bệnh
    treatment:   { type: String }, // Phương pháp điều trị
    
    // Toa thuốc (Nếu có)
    prescription: [{
        medicineName: { type: String },
        dosage:       { type: String }, // Liều lượng (vd: 2 viên/ngày)
        duration:     { type: String }  // Thời gian (vd: 5 ngày)
    }],
    
    notes: { type: String }, // Ghi chú thêm của bác sĩ
    testResults: [{ type: String }], // Mảng chứa URL ảnh kết quả xét nghiệm/X-quang
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);