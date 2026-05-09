const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
    name: { type: String, required: true },   // snapshot tên lúc đặt
    image: { type: String, default: '' },      // snapshot ảnh
    price: { type: Number, required: true },   // snapshot giá
    quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    items: [orderItemSchema],

    // Thông tin giao hàng
    shippingInfo: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        note: { type: String, default: '' },
    },

    // Thanh toán
    paymentMethod: {
        type: String,
        enum: ['cod', 'bank_transfer', 'vnpay'],
        default: 'cod',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },

    // Giá
    itemsTotal: { type: Number, required: true },  // tổng tiền hàng
    shippingFee: { type: Number, default: 0 },  // phí ship
    grandTotal: { type: Number, required: true },  // tổng cộng

    // Trạng thái đơn hàng
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
        default: 'pending',
    },
    cancelReason: { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.model('orders', orderSchema);