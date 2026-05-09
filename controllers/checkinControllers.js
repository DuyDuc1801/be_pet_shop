const Appointment = require('../models/appointment.model');
const dayjs       = require('dayjs');

// ── POST /api/appointments/:id/checkin ──────────────────────────
// Khách hàng tự bấm "Xác nhận đã đến phòng khám"
module.exports.customerCheckin = async (req, res) => {
    try {
        const apt = await Appointment.findOne({
            _id:      req.params.id,
            customer: req.user.id,
            status:   'Confirmed',
        });

        if (!apt)
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn hoặc lịch chưa được xác nhận.' });

        // Chỉ cho check-in trong vòng 2 tiếng trước và 30 phút sau giờ hẹn
        const aptTime   = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
        const now       = dayjs();
        const diffMin   = aptTime.diff(now, 'minute'); // âm = đã qua giờ hẹn

        if (diffMin > 120)
            return res.status(400).json({
                message: `Chưa đến giờ check-in. Vui lòng check-in trong vòng 2 tiếng trước giờ khám (${apt.time}).`,
            });

        if (diffMin < -30)
            return res.status(400).json({
                message: `Đã quá 30 phút kể từ giờ hẹn (${apt.time}). Vui lòng liên hệ lễ tân để được hỗ trợ.`,
            });

        apt.status      = 'CheckedIn';
        apt.checkedInAt = new Date();
        apt.checkedInBy = 'customer';
        await apt.save();

        const populated = await Appointment.findById(apt._id)
            .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } })
            .populate('service', 'name icon');

        res.status(200).json({
            message: '✅ Xác nhận check-in thành công! Bác sĩ sẽ gọi bạn vào khám sớm.',
            appointment: populated,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/doctor/appointments/:id/start-exam ────────────────
// Bác sĩ bắt đầu khám — chỉ khi khách hàng đã check-in
module.exports.startExam = async (req, res) => {
    try {
        const Doctor = require('../models/doctor.model');
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const apt = await Appointment.findOne({
            _id:    req.params.id,
            doctor: doctor._id,
        });

        if (!apt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

        // Kiểm tra trạng thái
        if (apt.status === 'Confirmed')
            return res.status(400).json({
                message: '⚠️ Khách hàng chưa check-in. Vui lòng đợi khách hàng xác nhận đã đến.',
                status: apt.status,
            });

        if (apt.status !== 'CheckedIn')
            return res.status(400).json({
                message: `Không thể bắt đầu khám. Trạng thái hiện tại: ${apt.status}`,
            });

        apt.status = 'InProgress';
        await apt.save();

        res.status(200).json({ message: '🩺 Bắt đầu khám bệnh!', appointment: apt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/appointments/:id/status ────────────────────────────
// Polling: bác sĩ kiểm tra khách hàng đã check-in chưa
module.exports.getStatus = async (req, res) => {
    try {
        const apt = await Appointment.findById(req.params.id)
            .select('status checkedInAt checkedInBy');
        if (!apt) return res.status(404).json({ message: 'Không tìm thấy.' });
        res.status(200).json({ status: apt.status, checkedInAt: apt.checkedInAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};