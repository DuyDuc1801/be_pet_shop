const Appointment   = require('../models/appointment.model');
const Doctor        = require('../models/doctor.model');
const LeaveRequest  = require('../models/leaveRequest.model');
const dayjs         = require('dayjs');

// ── Tất cả slot mặc định trong ngày ──────────────────────────────
const ALL_SLOTS = [
    '07:00','08:00','09:00','10:00','11:00',
    '13:00','14:00','15:00','16:00','17:00','18:00',
];

// Map thứ trong tuần JS (0=Sun) → key trong workSchedule
const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

// ── GET /api/appointments/available-slots ─────────────────────────
// ?doctorId=xxx&date=YYYY-MM-DD
module.exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date)
            return res.status(400).json({ message: 'Thiếu doctorId hoặc date.' });

        // 1. Lấy thông tin bác sĩ (workSchedule)
        const doctor = await Doctor.findById(doctorId);
        if (!doctor)
            return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });

        // 2. Xác định thứ trong tuần
        const dayOfWeek = dayjs(date).day();           // 0=Sun, 6=Sat
        const dayKey    = DAY_KEYS[dayOfWeek];          // 'monday', 'tuesday'...

        // 3. Lấy slots làm việc của bác sĩ trong ngày đó
        //    - Nếu workSchedule có cấu hình cho ngày đó → dùng nó
        //    - Nếu không có (mảng rỗng hoặc không tồn tại) → dùng ALL_SLOTS (làm full)
        const scheduledSlots = doctor.workSchedule?.[dayKey];
        let workingSlots = (scheduledSlots && scheduledSlots.length > 0)
            ? scheduledSlots
            : ALL_SLOTS;

        // 4. Kiểm tra LeaveRequest đã được duyệt cho ngày này
        const approvedLeave = await LeaveRequest.findOne({
            doctor: doctorId,
            date,
            status: 'approved',
        });

        if (approvedLeave) {
            if (approvedLeave.type === 'full_day') {
                // Nghỉ cả ngày → không có slot nào
                return res.status(200).json({
                    availableSlots: [],
                    reason: 'Bác sĩ đã được duyệt nghỉ ngày này.',
                });
            } else if (approvedLeave.type === 'partial') {
                // Nghỉ một số ca → loại bỏ các slot đã nghỉ
                const blockedSlots = new Set(approvedLeave.slots || []);
                workingSlots = workingSlots.filter(s => !blockedSlots.has(s));
            }
        }

        // 5. Lấy các slot đã có lịch hẹn (trạng thái chưa bị huỷ)
        const bookedAppointments = await Appointment.find({
            doctor: doctorId,
            date,
            status: { $in: ['Pending', 'Confirmed'] },
        }).select('time');

        const bookedSlots = new Set(bookedAppointments.map(a => a.time));

        // 6. Loại bỏ slot đã bị đặt
        const availableSlots = workingSlots.filter(s => !bookedSlots.has(s));

        // 7. Nếu là hôm nay → loại bỏ các slot đã qua giờ hiện tại
        const isToday = date === dayjs().format('YYYY-MM-DD');
        let finalSlots = availableSlots;
        if (isToday) {
            const nowMinutes = dayjs().hour() * 60 + dayjs().minute();
            finalSlots = availableSlots.filter(slot => {
                const [h, m] = slot.split(':').map(Number);
                return h * 60 + m > nowMinutes + 30; // buffer 30 phút
            });
        }

        res.status(200).json({
            availableSlots: finalSlots.sort(),
            workingSlots:   workingSlots.sort(),
            bookedSlots:    [...bookedSlots],
            leaveInfo:      approvedLeave ? {
                type:  approvedLeave.type,
                slots: approvedLeave.slots || [],
            } : null,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/appointments ────────────────────────────────────────
module.exports.create = async (req, res) => {
    try {
        const {
            doctorId, serviceId, date, time,
            petName, petType, petAge, petWeight, note,
        } = req.body;

        if (!doctorId || !serviceId || !date || !time || !petName)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });

        // Kiểm tra slot còn trống không (double-check trước khi tạo)
        const conflict = await Appointment.findOne({
            doctor: doctorId,
            date,
            time,
            status: { $in: ['Pending', 'Confirmed'] },
        });
        if (conflict)
            return res.status(409).json({ message: 'Slot giờ này vừa có người đặt. Vui lòng chọn giờ khác.' });

        // Kiểm tra bác sĩ không nghỉ ca đó
        const leave = await LeaveRequest.findOne({
            doctor: doctorId,
            date,
            status: 'approved',
        });
        if (leave) {
            if (leave.type === 'full_day')
                return res.status(400).json({ message: 'Bác sĩ đã được duyệt nghỉ ngày này.' });
            if (leave.type === 'partial' && leave.slots.includes(time))
                return res.status(400).json({ message: `Bác sĩ đã được duyệt nghỉ ca ${time}.` });
        }

        const appointment = await Appointment.create({
            customer:  req.user.id,
            doctor:    doctorId,
            service:   serviceId,
            date, time,
            petName, petType:   petType   || 'Chó',
            petAge:   petAge    || '',
            petWeight:petWeight || '',
            note:     note      || '',
            status:   'Pending',
        });

        const populated = await Appointment.findById(appointment._id)
            .populate('doctor',  { path: 'user', select: 'fullName' })
            .populate('service', 'name icon price');

        res.status(201).json({ message: 'Đặt lịch thành công!', appointment: populated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/appointments/my ──────────────────────────────────────
module.exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ customer: req.user.id })
            .populate({ path: 'doctor',  populate: { path: 'user', select: 'fullName avatar' } })
            .populate('service', 'name icon price duration')
            .sort({ date: -1, time: -1 });
        res.status(200).json({ appointments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── PUT /api/appointments/:id/cancel ─────────────────────────────
module.exports.cancel = async (req, res) => {
    try {
        const apt = await Appointment.findOne({
            _id:      req.params.id,
            customer: req.user.id,
            status:   { $in: ['Pending', 'Confirmed'] },
        });
        if (!apt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

        // Không cho hủy trong vòng 2 giờ trước giờ khám
        const CANCEL_HOURS = Number(process.env.CANCEL_HOURS_BEFORE) || 2;
        const aptTime = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm');
        if (aptTime.diff(dayjs(), 'hour') < CANCEL_HOURS)
            return res.status(400).json({
                message: `Không thể hủy trong vòng ${CANCEL_HOURS} tiếng trước giờ khám.`,
            });

        apt.status = 'Cancelled';
        apt.cancelReason = req.body.note || '';
        await apt.save();

        res.status(200).json({ message: 'Đã hủy lịch hẹn.', appointment: apt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/appointments/doctors (legacy - giữ lại) ──────────────
module.exports.getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .populate('user', 'fullName email avatar');
        res.status(200).json({ doctors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};