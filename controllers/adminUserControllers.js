const User   = require('../models/user.model');
const bcrypt = require('bcryptjs');

// GET /api/admin/users
module.exports.getAll = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (role) filter.role = role;
        if (search) filter.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email:    { $regex: search, $options: 'i' } },
        ];
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.status(200).json({ users, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/admin/users  — Admin tạo user mới
module.exports.create = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber, role } = req.body;

        if (!fullName || !email || !password)
            return res.status(400).json({ message: 'Vui lòng điền đủ họ tên, email và mật khẩu.' });

        if (password.length < 6)
            return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(400).json({ message: 'Email này đã được đăng ký.' });

        const allowed = ['Admin', 'Staff', 'Customer'];
        const hashed  = await bcrypt.hash(password, 10);
        const user    = await User.create({
            fullName:    fullName.trim(),
            email:       email.toLowerCase().trim(),
            password:    hashed,
            role:        allowed.includes(role) ? role : 'Customer',
            phoneNumber: phoneNumber || '',
        });

        const { password: _, ...userData } = user.toObject();
        res.status(201).json({ message: 'Tạo người dùng thành công!', user: userData });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PUT /api/admin/users/:id/role
module.exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        const allowed  = ['Admin', 'Staff', 'Customer'];
        if (!allowed.includes(role))
            return res.status(400).json({ message: 'Role không hợp lệ.' });
        const user = await User.findByIdAndUpdate(
            req.params.id, { role }, { returnDocument: 'after' }
        ).select('-password');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.status(200).json({ message: 'Cập nhật role thành công!', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/admin/users/:id/reset-password
module.exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự.' });
        const hashed = await bcrypt.hash(newPassword, 10);
        const user   = await User.findByIdAndUpdate(req.params.id, { password: hashed });
        if (!user) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/admin/users/:id
module.exports.remove = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.status(200).json({ message: 'Đã xóa người dùng.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};