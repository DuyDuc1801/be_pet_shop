const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports.register = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
            role: role || 'Customer'
        });

        await newUser.save();
        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Email hoặc mật khẩu sai" });
        }

        // Tạo JWT Token kèm Role
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({ token, role: user.role, name: user.fullName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};