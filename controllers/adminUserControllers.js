const User = require('../models/user.model');

// GET /api/admin/users
module.exports.getAll = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (role) filter.role = role;
        if (search) filter.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.status(200).json({ users, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/admin/users/:id/role
module.exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        const allowed = ['Admin', 'Doctor', 'Staff', 'Customer'];
        if (!allowed.includes(role))
            return res.status(400).json({ message: 'Role không hợp lệ.' });
        const user = await User.findByIdAndUpdate(
            req.params.id, { role },
            { returnDocument: 'after' }
        ).select('-password');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy user.' });
        res.status(200).json({ message: 'Cập nhật role thành công!', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};