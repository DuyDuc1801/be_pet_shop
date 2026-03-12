const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Đăng ký ──────────────────────────────────────────────────────
module.exports.register = async (req, res) => {
    try {
        const { fullName, email, password, phoneNumber } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã được sử dụng." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber: phoneNumber || '',
            role: 'Customer'
        });

        await newUser.save();
        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Đăng nhập ─────────────────────────────────────────────────────
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            token,
            role: user.role,
            name: user.fullName,
            email: user.email,
            id: user._id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Lấy thông tin profile ─────────────────────────────────────────
module.exports.getProfile = async (req, res) => {
    try {
        // req.user được gán từ verifyToken middleware
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Cập nhật profile ──────────────────────────────────────────────
module.exports.updateProfile = async (req, res) => {
    try {
        const { fullName, phoneNumber } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { fullName, phoneNumber },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        res.status(200).json({
            message: "Cập nhật thông tin thành công!",
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Đổi mật khẩu ─────────────────────────────────────────────────
module.exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        // Kiểm tra mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};