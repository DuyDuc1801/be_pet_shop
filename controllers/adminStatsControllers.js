const Order       = require('../models/order.model');
const Appointment = require('../models/appointment.model');
const User        = require('../models/user.model');
const Product     = require('../models/product.model');
const dayjs       = require('dayjs');

// ── GET /api/admin/stats/overview ────────────────────────────────
module.exports.getOverview = async (req, res) => {
    try {
        const today     = dayjs().format('YYYY-MM-DD');
        const thisMonth = dayjs().format('YYYY-MM');
        const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

        const thisMonthStart = `${thisMonth}-01`;
        const thisMonthEnd   = dayjs(thisMonthStart).endOf('month').format('YYYY-MM-DD');
        const lastMonthStart = `${lastMonth}-01`;
        const lastMonthEnd   = dayjs(lastMonthStart).endOf('month').format('YYYY-MM-DD');

        const [
            // Tháng này
            revenueThis, ordersThis, appointmentsThis, newUsersThis,
            // Tháng trước (để tính % tăng trưởng)
            revenueLast, ordersLast, appointmentsLast, newUsersLast,
            // Hôm nay
            todayOrders, todayAppointments,
            // Tổng
            totalUsers, totalProducts,
        ] = await Promise.all([
            // Revenue tháng này
            Order.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(thisMonthStart), $lte: new Date(thisMonthEnd + 'T23:59:59') } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
            Order.countDocuments({ createdAt: { $gte: new Date(thisMonthStart) } }),
            Appointment.countDocuments({ date: { $gte: thisMonthStart, $lte: thisMonthEnd } }),
            User.countDocuments({ createdAt: { $gte: new Date(thisMonthStart) } }),

            // Tháng trước
            Order.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(lastMonthStart), $lte: new Date(lastMonthEnd + 'T23:59:59') } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' } } },
            ]),
            Order.countDocuments({ createdAt: { $gte: new Date(lastMonthStart), $lte: new Date(lastMonthEnd + 'T23:59:59') } }),
            Appointment.countDocuments({ date: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
            User.countDocuments({ createdAt: { $gte: new Date(lastMonthStart), $lte: new Date(lastMonthEnd + 'T23:59:59') } }),

            // Hôm nay
            Order.countDocuments({ createdAt: { $gte: new Date(today) } }),
            Appointment.countDocuments({ date: today, status: { $nin: ['Cancelled'] } }),

            // Tổng
            User.countDocuments(),
            Product.countDocuments({ isActive: true }),
        ]);

        const calcGrowth = (curr, prev) => {
            if (!prev) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const revenueThisVal = revenueThis[0]?.total || 0;
        const revenueLastVal = revenueLast[0]?.total || 0;

        res.status(200).json({
            thisMonth: {
                revenue:      revenueThisVal,
                orders:       ordersThis,
                appointments: appointmentsThis,
                newUsers:     newUsersThis,
            },
            growth: {
                revenue:      calcGrowth(revenueThisVal, revenueLastVal),
                orders:       calcGrowth(ordersThis, ordersLast),
                appointments: calcGrowth(appointmentsThis, appointmentsLast),
                newUsers:     calcGrowth(newUsersThis, newUsersLast),
            },
            today: { orders: todayOrders, appointments: todayAppointments },
            total: { users: totalUsers, products: totalProducts },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/admin/stats/revenue-chart?months=12 ─────────────────
module.exports.getRevenueChart = async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 12;
        const data   = [];

        for (let i = months - 1; i >= 0; i--) {
            const d     = dayjs().subtract(i, 'month');
            const start = d.startOf('month').toDate();
            const end   = d.endOf('month').toDate();
            const label = d.format('MM/YYYY');

            const [revenue, orders, appointments] = await Promise.all([
                Order.aggregate([
                    { $match: { status: 'delivered', createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: '$grandTotal' } } },
                ]),
                Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                Appointment.countDocuments({
                    date: { $gte: d.format('YYYY-MM-01'), $lte: d.endOf('month').format('YYYY-MM-DD') },
                    status: { $nin: ['Cancelled'] },
                }),
            ]);

            data.push({
                month:        label,
                revenue:      revenue[0]?.total || 0,
                orders,
                appointments,
            });
        }

        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/admin/stats/top-products ────────────────────────────
module.exports.getTopProducts = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true })
            .sort({ sold: -1 }).limit(5)
            .select('name images sold price salePrice category');
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/admin/stats/category-revenue ────────────────────────
module.exports.getCategoryRevenue = async (req, res) => {
    try {
        const data = await Order.aggregate([
            { $match: { status: 'delivered' } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from:         'products',
                    localField:   'items.product',
                    foreignField: '_id',
                    as:           'productInfo',
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id:     '$productInfo.category',
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    count:   { $sum: '$items.quantity' },
                }
            },
            { $sort: { revenue: -1 } },
        ]);
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};