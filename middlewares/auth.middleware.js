const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── Xác thực JWT Token ────────────────────────────────────────────
module.exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy token. Vui lòng đăng nhập." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

// ── Kiểm tra Role ─────────────────────────────────────────────────
// Dùng: requireRole(['Admin', 'Doctor'])
module.exports.requireRole = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Chưa xác thực." });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Bạn không có quyền truy cập. Yêu cầu role: ${roles.join(', ')}`
            });
        }

        next();
    };
};