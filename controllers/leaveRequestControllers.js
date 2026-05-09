const LeaveRequest  = require('../models/leaveRequest.model');
const Appointment   = require('../models/appointment.model');
const Doctor        = require('../models/doctor.model');
const dayjs         = require('dayjs');

// ── Bác sĩ: Gửi yêu cầu nghỉ ────────────────────────────────────
// POST /api/leave-requests
module.exports.create = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { date, type, slots, reason } = req.body;

        if (!date || !type || !reason?.trim())
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ ngày, loại nghỉ và lý do.' });

        if (dayjs(date).isBefore(dayjs().startOf('day')))
            return res.status(400).json({ message: 'Không thể gửi yêu cầu cho ngày đã qua.' });

        // Kiểm tra đã có lịch hẹn chưa xác nhận không
        const pendingApts = await Appointment.find({
            doctor: doctor._id,
            date,
            status: { $in: ['Pending', 'Confirmed'] },
            ...(type === 'partial' && slots?.length ? { time: { $in: slots } } : {}),
        });

        if (pendingApts.length > 0) {
            return res.status(400).json({
                message: `Ngày ${dayjs(date).format('DD/MM/YYYY')} có ${pendingApts.length} lịch hẹn chưa hoàn thành. Vui lòng xử lý trước.`,
                appointments: pendingApts.map(a => ({ time: a.time, status: a.status })),
            });
        }

        const request = await LeaveRequest.create({
            doctor: doctor._id,
            date, type,
            slots:  type === 'partial' ? (slots || []) : [],
            reason: reason.trim(),
        });

        res.status(201).json({ message: 'Gửi yêu cầu thành công! Đợi admin duyệt.', request });
    } catch (err) {
        if (err.code === 11000)
            return res.status(400).json({ message: 'Bạn đã gửi yêu cầu cho ngày này rồi.' });
        res.status(500).json({ error: err.message });
    }
};

// ── Bác sĩ: Xem yêu cầu của mình ───────────────────────────────
// GET /api/leave-requests/my
module.exports.getMyRequests = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });

        const { month, status } = req.query;
        const filter = { doctor: doctor._id };
        if (status) filter.status = status;
        if (month) {
            filter.date = {
                $gte: `${month}-01`,
                $lte: dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD'),
            };
        }

        const requests = await LeaveRequest.find(filter)
            .sort({ date: 1, createdAt: -1 });

        res.status(200).json({ requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Bác sĩ: Hủy yêu cầu đang pending ───────────────────────────
// DELETE /api/leave-requests/:id
module.exports.cancel = async (req, res) => {
    try {
        const doctor  = await Doctor.findOne({ user: req.user.id });
        const request = await LeaveRequest.findOne({ _id: req.params.id, doctor: doctor._id });

        if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
        if (request.status !== 'pending')
            return res.status(400).json({ message: 'Chỉ có thể hủy yêu cầu đang chờ duyệt.' });

        await LeaveRequest.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã hủy yêu cầu.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Admin: Lấy tất cả yêu cầu ────────────────────────────────────
// GET /api/admin/leave-requests
module.exports.adminGetAll = async (req, res) => {
    try {
        const { status, doctorId, month, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)   filter.status = status;
        if (doctorId) filter.doctor = doctorId;
        if (month) {
            filter.date = {
                $gte: `${month}-01`,
                $lte: dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD'),
            };
        }

        const total    = await LeaveRequest.countDocuments(filter);
        const requests = await LeaveRequest.find(filter)
            .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName avatar email' } })
            .sort({ status: 1, date: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ requests, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Admin: Duyệt / Từ chối yêu cầu ─────────────────────────────
// PUT /api/admin/leave-requests/:id/review
module.exports.adminReview = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        if (!['approved', 'rejected'].includes(status))
            return res.status(400).json({ message: 'status phải là approved hoặc rejected.' });

        const request = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { status, adminNote: adminNote || '', reviewedBy: req.user.id, reviewedAt: new Date() },
            { returnDocument: 'after' }
        ).populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } });

        if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });

        res.status(200).json({
            message: status === 'approved' ? '✅ Đã duyệt yêu cầu nghỉ.' : '❌ Đã từ chối yêu cầu.',
            request,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Public: Lấy lịch available (dùng cho Booking) ───────────────
// GET /api/leave-requests/approved?doctorId=xxx&date=YYYY-MM-DD
module.exports.getApprovedLeaves = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        const filter = { status: 'approved' };
        if (doctorId) filter.doctor = doctorId;
        if (date)     filter.date   = date;

        const leaves = await LeaveRequest.find(filter).select('date type slots');
        res.status(200).json({ leaves });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};