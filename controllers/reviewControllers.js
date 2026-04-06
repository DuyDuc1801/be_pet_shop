const Review      = require('../models/review.model');
const Appointment = require('../models/appointment.model');
const Order       = require('../models/order.model');
const Doctor      = require('../models/doctor.model');
const Product     = require('../models/product.model');

// ── Tạo review bác sĩ sau khi khám xong ─────────────────────────
// POST /api/reviews/doctor
module.exports.createDoctorReview = async (req, res) => {
    try {
        const { appointmentId, rating, comment } = req.body;

        // Kiểm tra lịch hẹn tồn tại và thuộc về user này
        const appointment = await Appointment.findOne({
            _id:      appointmentId,
            customer: req.user.id,
            status:   'Completed',  // chỉ review khi đã hoàn thành
        });
        if (!appointment)
            return res.status(400).json({ message: 'Chỉ có thể đánh giá sau khi hoàn thành khám.' });

        // Kiểm tra đã review chưa
        const existing = await Review.findOne({ user: req.user.id, appointment: appointmentId });
        if (existing)
            return res.status(400).json({ message: 'Bạn đã đánh giá lịch khám này rồi.' });

        const review = await Review.create({
            user:        req.user.id,
            type:        'doctor',
            doctor:      appointment.doctor,
            appointment: appointmentId,
            rating,
            comment,
        });

        // Cập nhật rating trung bình của doctor
        await updateDoctorRating(appointment.doctor);

        res.status(201).json({ message: 'Cảm ơn đánh giá của bạn!', review });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: 'Bạn đã đánh giá lịch khám này rồi.' });
        res.status(500).json({ error: error.message });
    }
};

// ── Tạo review sản phẩm sau khi mua ─────────────────────────────
// POST /api/reviews/product
module.exports.createProductReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;

        // Kiểm tra đơn hàng đã giao xong chưa
        const order = await Order.findOne({
            _id:    orderId,
            user:   req.user.id,
            status: 'delivered',
        });
        if (!order)
            return res.status(400).json({ message: 'Chỉ có thể đánh giá sau khi nhận hàng.' });

        // Kiểm tra product có trong đơn hàng không
        const hasProduct = order.items.some(i => i.product.toString() === productId);
        if (!hasProduct)
            return res.status(400).json({ message: 'Sản phẩm không có trong đơn hàng này.' });

        // Kiểm tra đã review chưa
        const existing = await Review.findOne({ user: req.user.id, order: orderId, product: productId });
        if (existing)
            return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi.' });

        const review = await Review.create({
            user:    req.user.id,
            type:    'product',
            product: productId,
            order:   orderId,
            rating,
            comment,
        });

        // Cập nhật rating sản phẩm
        await updateProductRating(productId);

        res.status(201).json({ message: 'Cảm ơn đánh giá của bạn!', review });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi.' });
        res.status(500).json({ error: error.message });
    }
};

// ── Lấy reviews của bác sĩ ───────────────────────────────────────
// GET /api/reviews/doctor/:doctorId
module.exports.getDoctorReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const filter = { type: 'doctor', doctor: req.params.doctorId };
        const total   = await Review.countDocuments(filter);
        const reviews = await Review.find(filter)
            .populate('user', 'fullName avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.status(200).json({ reviews, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Lấy reviews của sản phẩm ─────────────────────────────────────
// GET /api/reviews/product/:productId
module.exports.getProductReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const filter  = { type: 'product', product: req.params.productId };
        const total   = await Review.countDocuments(filter);
        const reviews = await Review.find(filter)
            .populate('user', 'fullName avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.status(200).json({ reviews, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Kiểm tra user có thể review appointment/order không ──────────
// GET /api/reviews/can-review?type=doctor&id=appointmentId
module.exports.canReview = async (req, res) => {
    try {
        const { type, id } = req.query;
        if (type === 'doctor') {
            const apt      = await Appointment.findOne({ _id: id, customer: req.user.id, status: 'Completed' });
            const reviewed = await Review.findOne({ user: req.user.id, appointment: id });
            return res.status(200).json({ canReview: !!apt && !reviewed });
        }
        if (type === 'product') {
            const [orderId, productId] = id.split('_');
            const order    = await Order.findOne({ _id: orderId, user: req.user.id, status: 'delivered' });
            const reviewed = await Review.findOne({ user: req.user.id, order: orderId, product: productId });
            return res.status(200).json({ canReview: !!order && !reviewed });
        }
        res.status(400).json({ message: 'type không hợp lệ' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Helper: tính lại rating trung bình ───────────────────────────
async function updateDoctorRating(doctorId) {
    const stats = await Review.aggregate([
        { $match: { type: 'doctor', doctor: doctorId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
        await Doctor.findByIdAndUpdate(doctorId, {
            rating:      Math.round(stats[0].avg * 10) / 10,
            reviewCount: stats[0].count,
        });
    }
}

async function updateProductRating(productId) {
    const stats = await Review.aggregate([
        { $match: { type: 'product', product: new require('mongoose').Types.ObjectId(productId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            rating:      Math.round(stats[0].avg * 10) / 10,
            reviewCount: stats[0].count,
        });
    }
}