const crypto  = require('crypto');
const dayjs   = require('dayjs');
const qs      = require('qs');

const VNP_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_TMN_CODE = process.env.VNPAY_TMN_CODE || 'SANDBOX';
const VNP_HASH_SECRET= process.env.VNPAY_HASH_SECRET || 'SANDBOX_SECRET';
const VNP_RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payment/vnpay-return';

// Hàm sort chuẩn theo tài liệu VNPay
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

function createPaymentUrl({ amount, orderId, orderType, orderInfo, ipAddr }) {
    const date    = dayjs().format('YYYYMMDDHHmmss');
    const txnRef  = `${orderType}_${orderId}_${date}`;

    let params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNP_TMN_CODE,
        // Đảm bảo amount là số nguyên
        vnp_Amount:   Math.floor(amount * 100), 
        vnp_CurrCode:   'VND',
        vnp_TxnRef:     txnRef,
        vnp_OrderInfo:  orderInfo,
        vnp_OrderType:  'other',
        vnp_Locale:     'vn',
        vnp_ReturnUrl:  VNP_RETURN_URL,
        vnp_IpAddr:     ipAddr,
        vnp_CreateDate: date,
    };

    params = sortObject(params);

    // Chuỗi signData phải được băm từ các param đã sort và URL encode
    const signData   = qs.stringify(params, { encode: false }); 
    const hmac       = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed     = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    params.vnp_SecureHash = signed;

    // Trả về URL cuối cùng (encode: false vì sortObject đã mã hoá các giá trị bên trong params rồi)
    return `${VNP_URL}?${qs.stringify(params, { encode: false })}`;
}

function verifyReturn(query) {
    const secureHash = query.vnp_SecureHash;
    const params     = { ...query };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sorted   = sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    const hmac     = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed   = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
        isValid:    signed === secureHash,
        responseCode: query.vnp_ResponseCode,
        txnRef:     query.vnp_TxnRef,
        amount:     parseInt(query.vnp_Amount) / 100,
        bankCode:   query.vnp_BankCode,
        transactionNo: query.vnp_TransactionNo,
    };
}

function parseTxnRef(txnRef) {
    const parts = txnRef.split('_');
    return {
        type: parts[0],
        id:   parts[1],
    };
}

module.exports = { createPaymentUrl, verifyReturn, parseTxnRef };