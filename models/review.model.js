const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    type:    { type: String, enum: ['doctor', 'product'], required: true },

    // BỎ default: null để tránh lưu giá trị null giả vào database
    doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'doctors' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'appointments' },

    // BỎ default: null
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
    order:   { type: mongoose.Schema.Types.ObjectId, ref: 'orders' },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    isVerified: { type: Boolean, default: true }, // đã mua/đã khám
}, { timestamps: true });

// SỬ DỤNG partialFilterExpression THAY CHO sparse
reviewSchema.index(
    { user: 1, appointment: 1 }, 
    { 
        unique: true, 
        // Chỉ bắt unique nếu document có trường appointment
        partialFilterExpression: { appointment: { $exists: true } } 
    }
);

reviewSchema.index(
    { user: 1, order: 1, product: 1 }, 
    { 
        unique: true, 
        // Chỉ bắt unique nếu document có cả order và product
        partialFilterExpression: { order: { $exists: true }, product: { $exists: true } } 
    }
);

module.exports = mongoose.model('Review', reviewSchema);