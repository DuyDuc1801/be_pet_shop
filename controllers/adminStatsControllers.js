const Order       = require('../models/order.model');
const Appointment = require('../models/appointment.model');
const Product     = require('../models/product.model');
const User        = require('../models/user.model');
const StockImport = require('../models/stockImport.model');
const dayjs       = require('dayjs');

function getDateRange(month, year) {
    const y = parseInt(year) || dayjs().year();
    const m = parseInt(month);
    if (m >= 1 && m <= 12) {
        const start = dayjs(`${y}-${String(m).padStart(2,'0')}-01`).startOf('month').toDate();
        const end   = dayjs(`${y}-${String(m).padStart(2,'0')}-01`).endOf('month').toDate();
        return { start, end, label: `Tháng ${m}/${y}` };
    }
    return {
        start: dayjs(`${y}-01-01`).startOf('year').toDate(),
        end:   dayjs(`${y}-12-31`).endOf('year').toDate(),
        label: `Năm ${y}`,
    };
}

// GET /api/admin/stats/overview?month=3&year=2025
module.exports.getOverview = async (req, res) => {
    try {
        const { month = 0, year = dayjs().year() } = req.query;
        const { start, end, label } = getDateRange(month, year);

        const [revenueAgg, depositAgg, orderStats,
               aptStats, importAgg, newUsers] = await Promise.all([
            Order.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
            ]),
            Appointment.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: '$depositAmount' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Appointment.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            StockImport.aggregate([
                { $match: { createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null,
                    total: { $sum: '$totalAmount' },
                    paid:  { $sum: '$paidAmount'  },
                    count: { $sum: 1 } } },
            ]),
            User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        ]);

        const orderRev   = revenueAgg[0]?.total || 0;
        const depositRev = depositAgg[0]?.total || 0;
        const totalRev   = orderRev + depositRev;
        const importPaid = importAgg[0]?.paid  || 0;

        const orderMap = {};
        orderStats.forEach(o => { orderMap[o._id] = o.count; });
        const aptMap = {};
        aptStats.forEach(a => { aptMap[a._id] = a.count; });

        res.status(200).json({
            period: { month: parseInt(month), year: parseInt(year), label },
            revenue: {
                total:        totalRev,
                fromOrders:   orderRev,
                fromDeposits: depositRev,
                importCost:   importPaid,
                grossProfit:  totalRev - importPaid,
            },
            orders: {
                total:     Object.values(orderMap).reduce((a,b)=>a+b,0),
                pending:   orderMap['pending']   || 0,
                confirmed: orderMap['confirmed'] || 0,
                shipping:  orderMap['shipping']  || 0,
                delivered: revenueAgg[0]?.count  || 0,
                cancelled: orderMap['cancelled'] || 0,
            },
            appointments: {
                total:      Object.values(aptMap).reduce((a,b)=>a+b,0),
                pending:    aptMap['Pending']    || 0,
                confirmed:  aptMap['Confirmed']  || 0,
                checkedIn:  aptMap['CheckedIn']  || 0,
                inProgress: aptMap['InProgress'] || 0,
                completed:  aptMap['Completed']  || 0,
                cancelled:  aptMap['Cancelled']  || 0,
            },
            imports: {
                count:       importAgg[0]?.count || 0,
                totalAmount: importAgg[0]?.total || 0,
                paidAmount:  importPaid,
                debtAmount:  (importAgg[0]?.total||0) - importPaid,
            },
            newUsers,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/admin/stats/revenue-chart?month=0&year=2025
module.exports.getRevenueChart = async (req, res) => {
    try {
        const { month = 0, year = dayjs().year() } = req.query;
        const y = parseInt(year);
        const m = parseInt(month);
        const byMonth = !m || m === 0;
        const points  = byMonth ? 12 : dayjs(`${y}-${String(m).padStart(2,'0')}-01`).daysInMonth();
        const chartData = [];

        for (let i = 1; i <= points; i++) {
            let start, end;
            if (byMonth) {
                start = dayjs(`${y}-${String(i).padStart(2,'0')}-01`).startOf('month').toDate();
                end   = dayjs(`${y}-${String(i).padStart(2,'0')}-01`).endOf('month').toDate();
            } else {
                const ds = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                start = dayjs(ds).startOf('day').toDate();
                end   = dayjs(ds).endOf('day').toDate();
            }

            const [ordA, depA, impA] = await Promise.all([
                Order.aggregate([
                    { $match: { status: 'delivered', createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: '$grandTotal' } } },
                ]),
                Appointment.aggregate([
                    { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: '$depositAmount' } } },
                ]),
                StockImport.aggregate([
                    { $match: { createdAt: { $gte: start, $lte: end } } },
                    { $group: { _id: null, total: { $sum: '$paidAmount' } } },
                ]),
            ]);

            const orderRev   = ordA[0]?.total || 0;
            const depositRev = depA[0]?.total || 0;
            const importCost = impA[0]?.total || 0;
            const revenue    = orderRev + depositRev;

            chartData.push({
                label:      byMonth ? `T${i}` : `${i}`,
                revenue, orderRev, depositRev, importCost,
                profit: revenue - importCost,
            });
        }

        res.status(200).json({ chartData, byMonth });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/admin/stats/top-products?month=3&year=2025&limit=8
module.exports.getTopProducts = async (req, res) => {
    try {
        const { month = 0, year = dayjs().year(), limit = 8 } = req.query;
        const { start, end } = getDateRange(month, year);
        const topProducts = await Order.aggregate([
            { $match: { status: 'delivered', createdAt: { $gte: start, $lte: end } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product',
                name:     { $first: '$items.name'  },
                image:    { $first: '$items.image' },
                quantity: { $sum: '$items.quantity' },
                revenue:  { $sum: { $multiply: ['$items.price','$items.quantity'] } },
            }},
            { $sort: { revenue: -1 } },
            { $limit: parseInt(limit) },
        ]);
        res.status(200).json({ topProducts });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/admin/stats/category-revenue?month=3&year=2025
module.exports.getCategoryRevenue = async (req, res) => {
    try {
        const { month = 0, year = dayjs().year() } = req.query;
        const { start, end } = getDateRange(month, year);
        const data = await Order.aggregate([
            { $match: { status: 'delivered', createdAt: { $gte: start, $lte: end } } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product',
                foreignField: '_id', as: 'p' } },
            { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
            { $group: {
                _id:     { $ifNull: ['$p.category', 'Khác'] },
                revenue: { $sum: { $multiply: ['$items.price','$items.quantity'] } },
                count:   { $sum: '$items.quantity' },
            }},
            { $sort: { revenue: -1 } },
        ]);
        res.status(200).json({ categoryRevenue: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};