const Appointment = require('../models/appointment.model');

// Lấy tất cả lịch hẹn (filter + phân trang)
module.exports.getAll = async (req, res) => {
    try {
        const { date, status, doctorId, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (date)     filter.date   = date;
        if (status)   filter.status = status;
        if (doctorId) filter.doctor = doctorId;

        const total = await Appointment.countDocuments(filter);
        const appointments = await Appointment.find(filter)
            .populate('customer', 'fullName email phoneNumber')
            .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } })
            .populate('service', 'name price duration icon')
            .sort({ date: -1, time: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));


        res.status(200).json({ appointments, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật trạng thái lịch hẹn
module.exports.updateStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const allowed = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status, ...(adminNote !== undefined && { adminNote }) },
            { returnDocument: 'after' }
        ).populate('customer', 'fullName email')
         .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } })
         .populate('service', 'name price icon');

        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });
        }
        res.status(200).json({ message: 'Cập nhật thành công!', appointment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Thống kê nhanh cho dashboard
module.exports.getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [todayTotal, pending, confirmed, completed] = await Promise.all([
            Appointment.countDocuments({ date: today }),
            Appointment.countDocuments({ status: 'Pending' }),
            Appointment.countDocuments({ status: 'Confirmed' }),
            Appointment.countDocuments({ status: 'Completed' }),
        ]);
        res.status(200).json({ todayTotal, pending, confirmed, completed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};