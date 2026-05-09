// controllers/medicalRecord.controller.js
const MedicalRecord = require('../models/medicalRecord.model');
const Appointment = require('../models/appointment.model');

module.exports.createRecord = async (req, res) => {
    try {
        const { appointmentId, weight, symptoms, diagnosis, treatment, prescription, notes } = req.body;

        // 1. Lấy thông tin lịch hẹn để trích xuất petId và customerId
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });

        // 2. Tạo hồ sơ bệnh án
        const record = await MedicalRecord.create({
            appointment: appointmentId,
            pet:         appointment.petName,
            customer:    appointment.customer,
            doctor:      appointment.doctor,
            weight,
            symptoms,
            diagnosis,
            treatment,
            prescription,
            notes
        });

        // 3. Cập nhật trạng thái lịch hẹn thành 'Completed'
        appointment.status = 'Completed';
        await appointment.save();

        res.status(201).json({ message: 'Đã hoàn thành khám và tạo hồ sơ!', record });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy lịch sử bệnh án theo tên Pet và ID chủ nhân
module.exports.getPetHistory = async (req, res) => {
    try {
        // Đổi params thành petName
        const { petName } = req.params;
        
        // Mặc định lấy customerId là người đang đăng nhập (Khách hàng)
        let ownerId = req.user.id;

        // BẢO MẬT: Nếu người gọi API là Bác sĩ hoặc Admin, họ phải truyền customerId lên để xem bệnh án của khách
        if (['Doctor', 'Admin'].includes(req.user.role)) {
            if (!req.query.customerId) {
                return res.status(400).json({ message: 'Cần cung cấp ID khách hàng' });
            }
            ownerId = req.query.customerId;
        }

        // Tìm tất cả bệnh án khớp với Tên Pet VÀ ID Chủ nhân
       const history = await MedicalRecord.find({ pet: petName, customer: ownerId })
        .populate({
            path: 'doctor', // Nhảy từ Bệnh án sang bảng Doctor
            populate: {
                path: 'user', // Từ Doctor nhảy tiếp sang bảng User
                select: 'fullName' // Lấy tên
            }
        })
        .sort({ createdAt: -1 });

        console.log(JSON.stringify(history[0], null, 2));
            
        res.status(200).json({ history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};