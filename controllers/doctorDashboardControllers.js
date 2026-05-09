const DoctorSchedule = require('../models/doctorSchedule.model');
const Doctor         = require('../models/doctor.model');
const Appointment    = require('../models/appointment.model');
const dayjs          = require('dayjs');

// ── GET /api/doctor/dashboard ─────────────────────────────────────
module.exports.getDashboard = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const today      = dayjs().format('YYYY-MM-DD');
        const thisMonth  = dayjs().format('YYYY-MM');
        const start      = `${thisMonth}-01`;
        const end        = dayjs(start).endOf('month').format('YYYY-MM-DD');

        const [
            todayApts, pendingApts, checkedInApts,
            inProgressApts, monthApts, completedApts,
            recentReviews, avgRating,
        ] = await Promise.all([
            Appointment.countDocuments({ doctor: doctor._id, date: today, status: { $nin: ['Cancelled'] } }),
            Appointment.countDocuments({ doctor: doctor._id, status: 'Pending' }),
            Appointment.countDocuments({ doctor: doctor._id, status: 'CheckedIn' }),   // ← MỚI
            Appointment.countDocuments({ doctor: doctor._id, status: 'InProgress' }),  // ← MỚI
            Appointment.countDocuments({ doctor: doctor._id, date: { $gte: start, $lte: end } }),
            Appointment.countDocuments({ doctor: doctor._id, status: 'Completed' }),
            require('../models/review.model').find({ doctor: doctor._id, type: 'doctor' })
                .populate('user', 'fullName avatar').sort({ createdAt: -1 }).limit(5),
            require('../models/review.model').aggregate([
                { $match: { doctor: doctor._id, type: 'doctor' } },
                { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
            ]),
        ]);

        // Lịch hẹn hôm nay chi tiết
        const todayAppointments = await Appointment.find({
            doctor: doctor._id,
            date:   today,
            status: { $nin: ['Cancelled'] },
        })
            .populate('customer', 'fullName phoneNumber avatar')
            .populate('service',  'name icon duration price')
            .sort({ time: 1 });

        res.status(200).json({
            stats: {
                todayApts,
                pendingApts,
                checkedInApts,    // ← MỚI: khách đã đến
                inProgressApts,   // ← MỚI: đang khám
                monthApts,
                completedApts,
                avgRating:   avgRating[0]?.avg?.toFixed(1) || '0',
                reviewCount: avgRating[0]?.count || 0,
            },
            todayAppointments,
            recentReviews,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/doctor/schedule ──────────────────────────────────────
module.exports.getMySchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { month } = req.query;
        const start = month ? `${month}-01` : dayjs().format('YYYY-MM-01');
        const end   = dayjs(start).endOf('month').format('YYYY-MM-DD');

        const schedules = await DoctorSchedule.find({
            doctor: doctor._id,
            date:   { $gte: start, $lte: end },
        }).sort({ date: 1 });

        const appointments = await Appointment.aggregate([
            { $match: { doctor: doctor._id, date: { $gte: start, $lte: end }, status: { $nin: ['Cancelled'] } } },
            { $group: { _id: '$date', count: { $sum: 1 } } },
        ]);
        const aptMap = {};
        appointments.forEach(a => { aptMap[a._id] = a.count; });

        res.status(200).json({ schedules, aptMap });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/doctor/schedule ─────────────────────────────────────
module.exports.setSchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { date, type, slots, reason, note } = req.body;

        if (dayjs(date).isBefore(dayjs().startOf('day')))
            return res.status(400).json({ message: 'Không thể đăng ký lịch cho ngày đã qua.' });

        if (type === 'dayoff') {
            const hasApt = await Appointment.findOne({
                doctor: doctor._id, date, status: { $nin: ['Cancelled'] },
            });
            if (hasApt)
                return res.status(400).json({ message: `Ngày ${date} đã có lịch hẹn với bệnh nhân.` });
        }

        const schedule = await DoctorSchedule.findOneAndUpdate(
            { doctor: doctor._id, date },
            { doctor: doctor._id, date, type, slots: slots || [], reason: reason || '', note: note || '' },
            { upsert: true, returnDocument: 'after' }
        );

        res.status(200).json({ message: 'Cập nhật lịch thành công!', schedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── DELETE /api/doctor/schedule/:date ─────────────────────────────
module.exports.deleteSchedule = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        await DoctorSchedule.findOneAndDelete({ doctor: doctor._id, date: req.params.date });
        res.status(200).json({ message: 'Đã xóa lịch.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/doctor/appointments ──────────────────────────────────
module.exports.getMyAppointments = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { date, status, page = 1, limit = 10 } = req.query;
        const filter = { doctor: doctor._id };
        if (date)   filter.date   = date;
        if (status) filter.status = status;

        const total = await Appointment.countDocuments(filter);
        const appointments = await Appointment.find(filter)
            .populate('customer', 'fullName phoneNumber avatar')
            .populate('service',  'name icon price duration')
            .sort({ date: 1, time: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ appointments, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── PUT /api/doctor/appointments/:id/status ───────────────────────
module.exports.updateAppointmentStatus = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { status, adminNote } = req.body;
        const allowed = ['Confirmed', 'Completed', 'Cancelled'];
        if (!allowed.includes(status))
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

        const apt = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctor: doctor._id },
            { status, ...(adminNote !== undefined && { adminNote }) },
            { returnDocument: 'after' }
        )
            .populate('customer', 'fullName')
            .populate('service',  'name');

        if (!apt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });
        res.status(200).json({ message: 'Cập nhật thành công!', appointment: apt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};