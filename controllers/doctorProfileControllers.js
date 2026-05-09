const Doctor = require('../models/doctor.model');
const User   = require('../models/user.model');
const bcrypt = require('bcryptjs');

// ── GET /api/doctor/profile ──────────────────────────────────────
module.exports.getProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id })
            .populate('user',    'fullName email phoneNumber avatar createdAt')
            .populate('services','name icon category');

        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy thông tin bác sĩ.' });
        res.status(200).json({ doctor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── PUT /api/doctor/profile ──────────────────────────────────────
// Bác sĩ chỉ được sửa: ảnh, SĐT, bio. Không được sửa: email, chuyên khoa, bằng cấp
module.exports.updateProfile = async (req, res) => {
    try {
        const { phoneNumber, bio, photo } = req.body;

        // Cập nhật User
        const updateUser = {};
        if (phoneNumber !== undefined) updateUser.phoneNumber = phoneNumber;
        if (photo       !== undefined) updateUser.avatar      = photo;
        if (Object.keys(updateUser).length)
            await User.findByIdAndUpdate(req.user.id, updateUser);

        // Cập nhật Doctor
        const updateDoc = {};
        if (bio   !== undefined) updateDoc.bio   = bio;
        if (photo !== undefined) updateDoc.photo = photo;

        const doctor = await Doctor.findOneAndUpdate(
            { user: req.user.id }, updateDoc, { returnDocument: 'after' }
        ).populate('user', 'fullName email phoneNumber avatar')
         .populate('services', 'name icon category');

        res.status(200).json({ message: 'Cập nhật hồ sơ thành công!', doctor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── PUT /api/doctor/profile/change-password ──────────────────────
module.exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword)
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới.' });
        if (newPassword.length < 6)
            return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự.' });

        const user = await User.findById(req.user.id);
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match)
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
