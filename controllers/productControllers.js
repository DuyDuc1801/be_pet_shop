const Product = require('../models/product.model');

//Public: lấy danh sách sản phẩm
module.exports.getAll = async (req, res) => {
    try {
        const { category, petType, search, sort = 'newest', page = 1, limit = 12 } = req.query;
        const filter = { isActive: true };

        if (category) filter.category = category;
        if (petType)  filter.petType  = { $in: [petType, 'Cả hai'] };
        if (search)   filter.name     = { $regex: search, $options: 'i' };

        const sortMap = {
            newest:     { createdAt: -1 },
            price_asc:  { price: 1 },
            price_desc: { price: -1 },
            popular:    { sold: -1 },
            rating:     { rating: -1 },
        };

        const total    = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .sort(sortMap[sort] || sortMap.newest)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ products, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Public: chi tiết sản phẩm
module.exports.getOne = async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, isActive: true });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.status(200).json({ product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: tạo sản phẩm
module.exports.create = async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ message: 'Tạo sản phẩm thành công!', product });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Admin: cập nhật sản phẩm
module.exports.update = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.status(200).json({ message: 'Cập nhật thành công!', product });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Admin: xóa mềm
module.exports.remove = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { returnDocument: 'after' });
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        res.status(200).json({ message: 'Đã xóa sản phẩm.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};