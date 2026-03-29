const Appointment = require('../models/appointment.model');
const Doctor = require('../models/doctor.model');

// [Customer] Tạo lịch hẹn mới
module.exports.create = async (req, res) => {
    try {
        const { doctorId, serviceId, date, time, petName, petType, petAge, petWeight, note } = req.body;

        // Kiểm tra trùng lịch của bác sĩ
        const conflict = await Appointment.findOne({
            doctor: doctorId,
            date,
            time,
            status: { $in: ['Pending', 'Confirmed'] }
        });
        if (conflict) {
            return res.status(400).json({ message: 'Khung giờ này đã có lịch hẹn, vui lòng chọn giờ khác.' });
        }

        const appointment = new Appointment({
            customer: req.user.id,
            doctor:   doctorId,
            service:  serviceId,
            date, time,
            petName, petType, petAge, petWeight, note
        });

        await appointment.save();
        res.status(201).json({ message: 'Đặt lịch thành công!', appointment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [Customer] Lịch hẹn của tôi 
module.exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ customer: req.user.id })
            .populate('doctor', 'specialty avatar')
            .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } })
            .populate('service', 'name price duration icon')
            .sort({ date: -1, time: -1 });

        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//[Customer] Hủy lịch hẹn
module.exports.cancel = async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            _id: req.params.id,
            customer: req.user.id
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });
        }
        if (['Completed', 'Cancelled'].includes(appointment.status)) {
            return res.status(400).json({ message: 'Không thể hủy lịch hẹn này.' });
        }

        appointment.status = 'Cancelled';
        await appointment.save();
        res.status(200).json({ message: 'Hủy lịch hẹn thành công.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [Admin/Staff] Tất cả lịch hẹn
module.exports.getAll = async (req, res) => {
    try {
        const { date, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (date) filter.date = date;
        if (status) filter.status = status;

        const total = await Appointment.countDocuments(filter);
        const appointments = await Appointment.find(filter)
            .populate('customer', 'fullName email phoneNumber')
            .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } })
            .populate('service', 'name price duration icon')
            .sort({ date: -1, time: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ appointments, total, page: Number(page) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [Admin/Staff/Doctor] Cập nhật trạng thái
module.exports.updateStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status, ...(adminNote && { adminNote }) },
            { returnDocument: 'after' }
        );

        if (!appointment) {
            return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });
        }

        res.status(200).json({ message: 'Cập nhật thành công!', appointment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [Public] Lấy danh sách bác sĩ
module.exports.getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ isActive: true })
            .populate('user', 'fullName email phoneNumber');
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [Public] Lấy slot còn trống của bác sĩ theo ngày
module.exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date) {
            return res.status(400).json({ message: 'Thiếu doctorId hoặc date.' });
        }

        // Lấy lịch đã đặt của bác sĩ trong ngày đó
        const booked = await Appointment.find({
            doctor: doctorId,
            date,
            status: { $in: ['Pending', 'Confirmed'] }
        }).select('time');

        const bookedTimes = booked.map(a => a.time);

        // Tất cả slot trong ngày (theo thứ trong tuần)
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });

        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dayName  = dayNames[new Date(date).getDay()];
        const allSlots = doctor.workSchedule[dayName] || [];

        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        res.status(200).json({ allSlots, availableSlots, bookedTimes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};