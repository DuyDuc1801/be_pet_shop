const { createPaymentUrl, verifyReturn, parseTxnRef } = require('../configs/vnpay');
const Order = require('../models/order.model');
const Appointment = require('../models/appointment.model');
const User = require('../models/user.model');
const dayjs = require('dayjs');
const sendMail = require('../utils/sendMail'); 
const templates = require('../utils/templates');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── POST /api/payment/create-order ───────────────────────────────
// Tạo URL thanh toán VNPay cho đơn hàng
module.exports.createOrderPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ _id: orderId, user: req.user.id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        if (order.paymentStatus === 'paid')
            return res.status(400).json({ message: 'Đơn hàng đã được thanh toán.' });

        let ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        ipAddr = ipAddr.split(',')[0].trim();
        if (ipAddr === '::1') {
            ipAddr = '127.0.0.1';
        }
        const url    = createPaymentUrl({
            amount:    order.grandTotal,
            orderId:   orderId,
            orderType: 'order',
            orderInfo: `Thanh toan don hang PooGi #${String(orderId).slice(-8).toUpperCase()}`,
            ipAddr,
        });

        res.status(200).json({ paymentUrl: url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/payment/create-appointment ─────────────────────────
// Tạo URL thanh toán đặt cọc lịch hẹn (30% phí dịch vụ)
module.exports.createAppointmentPayment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const apt = await Appointment.findOne({ _id: appointmentId, customer: req.user.id })
            .populate('service', 'name price');
        if (!apt) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

        if (apt.depositPaid)
            return res.status(400).json({ message: 'Lịch hẹn đã được đặt cọc.' });

        // Đặt cọc 30% phí dịch vụ, tối thiểu 50,000đ
        const depositAmount = Math.max(Math.round(apt.service.price * 0.3), 50000);
        const ipAddr        = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        const url = createPaymentUrl({
            amount:    depositAmount,
            orderId:   appointmentId,
            orderType: 'appointment',
            orderInfo: `Dat coc lich kham PooGi - ${apt.service.name}`,
            ipAddr,
        });

        res.status(200).json({ paymentUrl: url, depositAmount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── GET /api/payment/vnpay-return ────────────────────────────────
// VNPay redirect về đây sau khi user hoàn thành thanh toán
module.exports.vnpayReturn = async (req, res) => {
    try {
        const result = verifyReturn(req.query);

        if (!result.isValid) {
            return res.redirect(`${FRONTEND_URL}/payment-result?status=invalid`);
        }

        const isSuccess = result.responseCode === '00';
        const { type, id } = parseTxnRef(result.txnRef);

        if (isSuccess) {
            await handlePaymentSuccess({ type, id, result });
        }

        // Redirect về frontend với kết quả
        const params = new URLSearchParams({
            status:  isSuccess ? 'success' : 'failed',
            type,
            id,
            amount:  result.amount,
            txnNo:   result.transactionNo || '',
            code:    result.responseCode,
        });
        res.redirect(`${FRONTEND_URL}/payment-result?${params}`);
    } catch (error) {
        console.error('VNPay return error:', error.message);
        res.redirect(`${FRONTEND_URL}/payment-result?status=error`);
    }
};

// ── GET /api/payment/vnpay-ipn ────────────────────────────────────
// VNPay gọi IPN để xác nhận server-to-server (tin cậy hơn return URL)
module.exports.vnpayIPN = async (req, res) => {
    try {
        const result = verifyReturn(req.query);

        if (!result.isValid) {
            return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
        }

        const { type, id } = parseTxnRef(result.txnRef);
        const isSuccess    = result.responseCode === '00';

        if (isSuccess) {
            const alreadyPaid = await checkAlreadyPaid(type, id);
            if (alreadyPaid) {
                return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
            }
            await handlePaymentSuccess({ type, id, result });
        }

        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (error) {
        res.status(200).json({ RspCode: '99', Message: error.message });
    }
};

// ── Helper: xử lý sau khi thanh toán thành công ──────────────────
async function handlePaymentSuccess({ type, id, result }) {
    if (type === 'order') {
        const order = await Order.findByIdAndUpdate(id, {
            paymentStatus: 'paid',
            paymentMethod: 'vnpay',
            vnpayTransactionNo: result.transactionNo,
        }, { returnDocument: 'after' }).populate('user', 'fullName email');

        if (order?.user?.email) {
            //Gửi email xác nhận đơn hàng
            await sendMail({
                to:      order.user.email,
                subject: `✅ PooGi - Xác nhận đơn hàng #${String(id).slice(-8).toUpperCase()}`,
                html:    templates.orderConfirm({
                    fullName:      order.user.fullName,
                    orderId:       id,
                    items:         order.items,
                    grandTotal:    order.grandTotal,
                    shippingInfo:  order.shippingInfo,
                    paymentMethod: 'vnpay',
                }),
            });
            //Gửi email thanh toán thành công
            await sendMail({
                to: order.user.email,
                subject: '💳 PooGi - Thanh toán VNPay thành công',
                html: templates.paymentSuccess({
                    fullName: order.user.fullName,
                    amount: result.amount,
                    transactionNo: result.transactionNo,
                    orderType: 'order',
                    refId: id,
                }),
            });
        }
    }

    if (type === 'appointment') {
        const apt = await Appointment.findByIdAndUpdate(id, {
            depositPaid: true,
            depositAmount: result.amount,
            vnpayTransactionNo: result.transactionNo,
            status: 'Confirmed',
        }, { returnDocument: 'after' })
            .populate('customer', 'fullName email')
            .populate('doctor', 'user')
            .populate('service', 'name price');

        if (apt?.customer?.email) {
            // Lấy tên bác sĩ
            const doctorUser = await User.findById(apt.doctor?.user);

            await sendMail({
                to:      apt.customer.email,
                subject: `✅ PooGi - Xác nhận đặt lịch khám #${String(id).slice(-8).toUpperCase()}`,
                html:    templates.appointmentConfirm({
                    fullName:    apt.customer.fullName,
                    petName:     apt.petName,
                    serviceName: apt.service?.name,
                    doctorName:  doctorUser?.fullName || 'PooGi',
                    date:        dayjs(apt.date).format('DD/MM/YYYY'),
                    time:        apt.time,
                    price:       `${apt.service?.price?.toLocaleString('vi-VN')}₫`,
                    appointmentId: id,
                }),
            });
        }
    }
}

async function checkAlreadyPaid(type, id) {
    if (type === 'order') {
        const o = await Order.findById(id);
        return o?.paymentStatus === 'paid';
    }
    if (type === 'appointment') {
        const a = await Appointment.findById(id);
        return a?.depositPaid === true;
    }
    return false;
}