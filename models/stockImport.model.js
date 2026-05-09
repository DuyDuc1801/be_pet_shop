const mongoose = require('mongoose');

// ── Chi tiết từng sản phẩm trong phiếu nhập ──────────────────────
const importItemSchema = new mongoose.Schema({
    product:      { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
    productName:  { type: String, required: true },  // snapshot tên khi nhập
    quantity:     { type: Number, required: true, min: 1 },
    costPrice:    { type: Number, required: true, min: 0 },  // giá nhập mỗi đơn vị
    totalCost:    { type: Number, required: true },           // quantity * costPrice
    note:         { type: String, default: '' },
}, { _id: false });

// ── Phiếu nhập hàng ───────────────────────────────────────────────
const stockImportSchema = new mongoose.Schema({
    importCode:   { type: String, unique: true },       // Mã phiếu: IMP-20260414-001
    supplier:     { type: String, required: true },     // Tên nhà cung cấp
    supplierPhone:{ type: String, default: '' },
    items:        [importItemSchema],
    totalAmount:  { type: Number, required: true },     // Tổng tiền nhập
    paidAmount:   { type: Number, default: 0 },         // Đã thanh toán
    paymentStatus:{
        type:    String,
        enum:    ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
    },
    paymentMethod:{ type: String, default: 'cash' },   // cash / transfer
    importDate:   { type: String, required: true },     // YYYY-MM-DD
    note:         { type: String, default: '' },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    status:       {
        type:    String,
        enum:    ['draft', 'confirmed'],
        default: 'confirmed',
    },
}, { timestamps: true });

// Auto-generate importCode trước khi save
stockImportSchema.pre('save', async function () {
    if (!this.importCode) {
        const today  = new Date();
        const pad    = n => String(n).padStart(2, '0');
        const prefix = `IMP-${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
        const count  = await mongoose.model('StockImport').countDocuments({
            importCode: { $regex: `^${prefix}` }
        });
        this.importCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
});

module.exports = mongoose.model('StockImport', stockImportSchema);