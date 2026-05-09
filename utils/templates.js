// Template mail

module.exports = {
    orderConfirm: ({ fullName, orderId, items, grandTotal, shippingInfo, paymentMethod }) => {
        return `
            <h2>Xin chào ${fullName},</h2>
            <p>Cảm ơn bạn đã đặt hàng tại PooGi. Mã đơn hàng của bạn là <b>#${String(orderId).slice(-8).toUpperCase()}</b>.</p>
            <p>Tổng tiền: <b>${grandTotal.toLocaleString('vi-VN')}₫</b></p>
            <p>Đơn hàng sẽ sớm được giao đến bạn!</p>
        `;
    },

    paymentSuccess: ({ fullName, amount, transactionNo, orderType, refId }) => {
        return `
            <h2>Thanh toán thành công!</h2>
            <p>Xin chào ${fullName},</p>
            <p>Hệ thống đã ghi nhận khoản thanh toán <b>${amount.toLocaleString('vi-VN')}₫</b> qua VNPay.</p>
            <p>Mã giao dịch VNPay: ${transactionNo}</p>
        `;
    },

    appointmentConfirm: ({ fullName, petName, serviceName, doctorName, date, time, price, appointmentId }) => {
        return `
            <h2>Xác nhận đặt lịch khám</h2>
            <p>Chào ${fullName}, lịch hẹn cho bé <b>${petName}</b> đã được xác nhận thành công.</p>
            <ul>
                <li>Dịch vụ: ${serviceName}</li>
                <li>Bác sĩ: ${doctorName}</li>
                <li>Thời gian: ${time} ngày ${date}</li>
            </ul>
            <p>Phí dịch vụ dự kiến: ${price}</p>
        `;
    }
};