const Doctor  = require('../models/doctor.model');
const User    = require('../models/user.model');
const Service = require('../models/service.model');
const bcrypt  = require('bcryptjs');

// GET /api/admin/doctors
module.exports.getAll = async (req, res) => {
    try {
        const { search, specialty, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (specialty) filter.specialty = specialty;

        let doctors = await Doctor.find(filter)
            .populate('user',    'fullName email phoneNumber avatar')
            .populate('services','name icon category')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        if (search) {
            const kw = search.toLowerCase();
            doctors = doctors.filter(d =>
                d.user?.fullName?.toLowerCase().includes(kw) ||
                d.user?.email?.toLowerCase().includes(kw)    ||
                d.specialty?.toLowerCase().includes(kw)
            );
        }

        const total = await Doctor.countDocuments(filter);
        res.status(200).json({ doctors, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/admin/doctors  — tạo user Doctor + doctor profile cùng lúc
module.exports.create = async (req, res) => {
    try {
        const {
            // Thông tin tài khoản
            fullName, email, password, phoneNumber,
            // Thông tin bác sĩ
            specialty, degree, bio, photo, serviceIds, workSchedule,
        } = req.body;

        // Validate bắt buộc
        if (!fullName || !email || !password || !specialty || !degree)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc: họ tên, email, mật khẩu, chuyên khoa, bằng cấp.' });

        if (password.length < 6)
            return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

        // Kiểm tra email trùng
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(400).json({ message: 'Email này đã được đăng ký.' });

        // Tạo user với role Doctor
        const hashed = await bcrypt.hash(password, 10);
        const user   = await User.create({
            fullName: fullName.trim(),
            email:    email.toLowerCase().trim(),
            password: hashed,
            role:     'Doctor',
            phoneNumber: phoneNumber || '',
        });

        // Validate serviceIds
        const validServiceIds = [];
        if (serviceIds?.length) {
            const services = await Service.find({ _id: { $in: serviceIds } });
            validServiceIds.push(...services.map(s => s._id));
        }

        // Tạo doctor profile
        const doctor = await Doctor.create({
            user:         user._id,
            specialty:    specialty.trim(),
            degree:       degree.trim(),
            bio:          bio || '',
            photo:        photo || '',
            services:     validServiceIds,
            workSchedule: workSchedule || {},
        });

        const populated = await Doctor.findById(doctor._id)
            .populate('user',    'fullName email phoneNumber')
            .populate('services','name icon');

        res.status(201).json({ message: 'Tạo bác sĩ thành công!', doctor: populated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PUT /api/admin/doctors/:id
module.exports.update = async (req, res) => {
    try {
        const {
            // User fields
            fullName, phoneNumber, photo,
            // Doctor fields
            specialty, degree, bio, serviceIds, workSchedule,
        } = req.body;

        const doctor = await Doctor.findById(req.params.id).populate('user');
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });

        // Cập nhật user info
        if (fullName)     await User.findByIdAndUpdate(doctor.user._id, { fullName: fullName.trim() });
        if (phoneNumber)  await User.findByIdAndUpdate(doctor.user._id, { phoneNumber });

        // Validate services
        let validServiceIds = doctor.services;
        if (serviceIds !== undefined) {
            const services = await Service.find({ _id: { $in: serviceIds } });
            validServiceIds = services.map(s => s._id);
        }

        // Cập nhật doctor profile
        const updated = await Doctor.findByIdAndUpdate(
            req.params.id,
            {
                specialty:    specialty   || doctor.specialty,
                degree:       degree      || doctor.degree,
                bio:          bio         ?? doctor.bio,
                photo:        photo       ?? doctor.photo,
                services:     validServiceIds,
                workSchedule: workSchedule ?? doctor.workSchedule,
            },
            { returnDocument: 'after' }
        ).populate('user', 'fullName email phoneNumber')
         .populate('services', 'name icon category');

        res.status(200).json({ message: 'Cập nhật bác sĩ thành công!', doctor: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// DELETE /api/admin/doctors/:id
module.exports.remove = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });

        // Đổi role về Customer thay vì xóa user hẳn (giữ lịch sử)
        await User.findByIdAndUpdate(doctor.user, { role: 'Customer' });
        await Doctor.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Đã xóa bác sĩ. Tài khoản được chuyển về Customer.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/admin/doctors/:id/reset-password
module.exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự.' });

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(doctor.user, { password: hashed });
        res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};