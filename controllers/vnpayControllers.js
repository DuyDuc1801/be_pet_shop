const crypto = require('crypto');
const querystring = require('qs');
const dayjs = require('dayjs');
const vnpConfig = require('../configs/vnpay');
const Order = require('../models/order.model');
const Appointment = require('../models/appointment.model');

// 1. Hàm tạo URL thanh toán
module.exports.createPaymentUrl = async (req, res) => {
    try {
        const { amount, orderId, orderType } = req.body; // orderType: 'order' hoặc 'appointment'
        let vnp_Params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': vnpConfig.vnp_TmnCode,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': `${orderId}_${Date.now()}`,
            'vnp_OrderInfo': `Thanh toan ${orderType} ID: ${orderId}`,
            'vnp_OrderType': 'other',
            'vnp_Amount': amount * 100,
            'vnp_ReturnUrl': vnpConfig.vnp_ReturnUrl,
            'vnp_IpAddr': req.ip,
            'vnp_CreateDate': dayjs().format('YYYYMMDDHHmmss')
        };

        // Sắp xếp tham số (bắt buộc)
        vnp_Params = Object.keys(vnp_Params).sort().reduce((obj, key) => {
            obj[key] = vnp_Params[key];
            return obj;
        }, {});

        // Tạo chữ ký
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", vnpConfig.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        
        vnp_Params['vnp_SecureHash'] = signed;
        const paymentUrl = vnpConfig.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Hàm xử lý kết quả trả về (VNPay Redirect về đây)
module.exports.vnpayReturn = async (req, res) => {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = Object.keys(vnp_Params).sort().reduce((obj, key) => {
        obj[key] = vnp_Params[key];
        return obj;
    }, {});

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnpConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        const orderId = vnp_Params['vnp_TxnRef'].split('_')[0];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        if (responseCode === "00") {
            if (vnp_Params['vnp_OrderInfo'].includes('order')) {
                await Order.findByIdAndUpdate(orderId, { paymentStatus: 'paid' });
            } else {
                // Cập nhật lịch hẹn: Đã thanh toán và Xác nhận
                await Appointment.findByIdAndUpdate(orderId, { 
                    isPaid: true, 
                    status: 'Confirmed' 
                });
            }
            return res.redirect('http://localhost:5173/payment-success');
        }
    }
    res.redirect('http://localhost:5173/payment-failed');
};