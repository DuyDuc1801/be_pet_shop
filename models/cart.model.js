const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price:    { type: Number, required: true },
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
}, { timestamps: true });

// Virtual: tổng tiền
cartSchema.virtual('total').get(function () {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});

module.exports = mongoose.model('carts', cartSchema);