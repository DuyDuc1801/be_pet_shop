const StockImport = require('../models/stockImport.model');
const Product     = require('../models/product.model');

// ── GET /api/admin/inventory — Danh sách phiếu nhập ─────────────
module.exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 15, search, paymentStatus } = req.query;
        const filter = {};
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (search) filter.$or = [
            { importCode: { $regex: search, $options: 'i' } },
            { supplier:   { $regex: search, $options: 'i' } },
        ];

        const total   = await StockImport.countDocuments(filter);
        const imports = await StockImport.find(filter)
            .populate('createdBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        // Tổng tiền đã nhập
        const stats = await StockImport.aggregate([
            { $group: { _id: null, totalAmount: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' } } }
        ]);

        res.status(200).json({ imports, total, stats: stats[0] || { totalAmount: 0, totalPaid: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/admin/inventory/:id — Chi tiết phiếu nhập ──────────
module.exports.getOne = async (req, res) => {
    try {
        const imp = await StockImport.findById(req.params.id)
            .populate('items.product', 'name images category')
            .populate('createdBy', 'fullName');
        if (!imp) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
        res.status(200).json({ import: imp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/admin/inventory — Tạo phiếu nhập + cập nhật tồn kho
module.exports.create = async (req, res) => {
    try {
        const { supplier, supplierPhone, items, paidAmount, paymentMethod, importDate, note } = req.body;

        if (!supplier?.trim())
            return res.status(400).json({ message: 'Vui lòng nhập tên nhà cung cấp.' });
        if (!items?.length)
            return res.status(400).json({ message: 'Phiếu nhập phải có ít nhất 1 sản phẩm.' });
        if (!importDate)
            return res.status(400).json({ message: 'Vui lòng chọn ngày nhập hàng.' });

        // Validate từng item và lấy tên sản phẩm
        const processedItems = [];
        let   totalAmount    = 0;

        for (const item of items) {
            if (!item.product || !item.quantity || !item.costPrice)
                return res.status(400).json({ message: 'Mỗi sản phẩm cần có mã, số lượng và giá nhập.' });

            const product = await Product.findById(item.product);
            if (!product)
                return res.status(400).json({ message: `Không tìm thấy sản phẩm ID: ${item.product}` });

            const total = item.quantity * item.costPrice;
            totalAmount += total;

            processedItems.push({
                product:     product._id,
                productName: product.name,
                quantity:    Number(item.quantity),
                costPrice:   Number(item.costPrice),
                totalCost:   total,
                note:        item.note || '',
            });
        }

        const paid = Number(paidAmount) || 0;
        const paymentStatus = paid <= 0 ? 'unpaid'
            : paid >= totalAmount       ? 'paid'
            : 'partial';

        // Tạo phiếu nhập
        const stockImport = await StockImport.create({
            supplier:      supplier.trim(),
            supplierPhone: supplierPhone || '',
            items:         processedItems,
            totalAmount,
            paidAmount:    paid,
            paymentStatus,
            paymentMethod: paymentMethod || 'cash',
            importDate,
            note:          note || '',
            createdBy:     req.user.id,
            status:        'confirmed',
        });

        // Cập nhật tồn kho tự động
        for (const item of processedItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            });
        }

        const populated = await StockImport.findById(stockImport._id)
            .populate('items.product', 'name images')
            .populate('createdBy', 'fullName');

        res.status(201).json({ message: `Nhập hàng thành công! Đã cập nhật tồn kho ${processedItems.length} sản phẩm.`, import: populated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// ── PUT /api/admin/inventory/:id/payment — Cập nhật thanh toán ──
module.exports.updatePayment = async (req, res) => {
    try {
        const { paidAmount } = req.body;
        const imp = await StockImport.findById(req.params.id);
        if (!imp) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });

        const paid = Number(paidAmount);
        imp.paidAmount    = paid;
        imp.paymentStatus = paid <= 0              ? 'unpaid'
            : paid >= imp.totalAmount              ? 'paid'
            : 'partial';
        await imp.save();

        res.status(200).json({ message: 'Cập nhật thanh toán thành công!', import: imp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── DELETE /api/admin/inventory/:id — Xóa & hoàn tồn kho ────────
module.exports.remove = async (req, res) => {
    try {
        const imp = await StockImport.findById(req.params.id);
        if (!imp) return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });

        // Hoàn lại tồn kho
        for (const item of imp.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity },
            });
        }

        await StockImport.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã xóa phiếu nhập và hoàn lại tồn kho.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
