const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

const SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

// ── Customer: Tạo đơn hàng từ giỏ hàng ──────────────────────────
// POST /api/orders
module.exports.createOrder = async (req, res) => {
    try {
        const { shippingInfo, paymentMethod = 'cod' } = req.body;

        // Validate shipping info
        const { fullName, phone, address, city } = shippingInfo || {};
        if (!fullName || !phone || !address || !city)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin giao hàng.' });

        // Lấy giỏ hàng
        const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product', 'name images price salePrice stock isActive');

        if (!cart || cart.items.length === 0)
            return res.status(400).json({ message: 'Giỏ hàng trống.' });

        // Kiểm tra tồn kho & build order items
        const orderItems = [];
        for (const item of cart.items) {
            const product = item.product;
            if (!product || !product.isActive)
                return res.status(400).json({ message: `Sản phẩm "${item.product?.name}" không còn bán.` });
            if (product.stock < item.quantity)
                return res.status(400).json({ message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm.` });

            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.images?.[0] || '',
                price: item.price,
                quantity: item.quantity,
            });
        }

        // Tính tiền
        const itemsTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const shippingFee = itemsTotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
        const grandTotal = itemsTotal + shippingFee;

        // Tạo đơn hàng
        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            shippingInfo,
            paymentMethod,
            itemsTotal,
            shippingFee,
            grandTotal,
        });

        // Trừ tồn kho + tăng số đã bán
        await Promise.all(orderItems.map(item =>
            Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity, sold: item.quantity },
            })
        ));

        // Xóa giỏ hàng sau khi đặt xong
        await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

        res.status(201).json({ message: 'Đặt hàng thành công! 🎉', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Customer: Danh sách đơn hàng của mình ────────────────────────
// GET /api/orders/my
module.exports.getMyOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = { user: req.user.id };
        if (status) filter.status = status;

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ orders, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Customer: Chi tiết đơn hàng ──────────────────────────────────
// GET /api/orders/my/:id
module.exports.getOrderDetail = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.status(200).json({ order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Customer: Hủy đơn hàng ───────────────────────────────────────
// PUT /api/orders/my/:id/cancel
module.exports.cancelOrder = async (req, res) => {
    try {
        const { reason = '' } = req.body;
        const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        if (!['pending', 'confirmed'].includes(order.status))
            return res.status(400).json({ message: 'Không thể hủy đơn hàng đang vận chuyển hoặc đã giao.' });

        order.status       = 'cancelled';
        order.cancelReason = reason;
        await order.save();

        // Hoàn lại tồn kho
        await Promise.all(order.items.map(item =>
            Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity, sold: -item.quantity },
            })
        ));

        res.status(200).json({ message: 'Đã hủy đơn hàng.', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Admin: Lấy tất cả đơn hàng ───────────────────────────────────
// GET /api/admin/orders
module.exports.adminGetAll = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const total  = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('user', 'fullName email phoneNumber')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ orders, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Admin: Cập nhật trạng thái đơn hàng ──────────────────────────
// PUT /api/admin/orders/:id/status
module.exports.adminUpdateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        if (!allowed.includes(status))
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, ...(status === 'delivered' && { paymentStatus: 'paid' }) },
            { returnDocument: 'after' }
        ).populate('user', 'fullName email');

        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.status(200).json({ message: 'Cập nhật thành công!', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Admin: Thống kê đơn hàng ─────────────────────────────────────
// GET /api/admin/orders/stats
module.exports.adminGetStats = async (req, res) => {
    try {
        const [pending, confirmed, shipping, delivered, cancelled, revenue] = await Promise.all([
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'confirmed' }),
            Order.countDocuments({ status: 'shipping'  }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' }),
            Order.aggregate([
                { $match: { status: 'delivered' } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
        ]);

        res.status(200).json({
            pending, confirmed, shipping, delivered, cancelled,
            revenue: revenue[0]?.total || 0,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};