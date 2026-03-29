const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price:       { type: Number, required: true, min: 0 },
    salePrice:   { type: Number, default: null },      // giá khuyến mãi
    images:      [{ type: String }],                   // mảng URL ảnh
    category:    {
        type: String,
        enum: ['Thức ăn', 'Phụ kiện', 'Thuốc & Vitamin', 'Vệ sinh', 'Đồ chơi', 'Khác'],
        default: 'Khác',
    },
    petType:     { type: String, enum: ['Chó', 'Mèo', 'Cả hai', 'Khác'], default: 'Cả hai' },
    stock:       { type: Number, default: 0, min: 0 },
    sold:        { type: Number, default: 0 },
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    tags:        [{ type: String }],
    isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// Virtual: giá hiệu lực
productSchema.virtual('effectivePrice').get(function () {
    return this.salePrice ?? this.price;
});

module.exports = mongoose.model('products', productSchema);