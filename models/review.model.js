const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    type:    { type: String, enum: ['doctor', 'product'], required: true },

    // Với doctor review
    doctor:      { type: mongoose.Schema.Types.ObjectId, ref: 'doctors', default: null },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'appointments', default: null },

    // Với product review
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
    order:   { type: mongoose.Schema.Types.ObjectId, ref: 'orders',   default: null },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    isVerified: { type: Boolean, default: true }, // đã mua/đã khám
}, { timestamps: true });

// Mỗi user chỉ review 1 lần cho 1 doctor/appointment hoặc 1 product/order
reviewSchema.index({ user: 1, appointment: 1 }, { unique: true, sparse: true });
reviewSchema.index({ user: 1, order: 1, product: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);