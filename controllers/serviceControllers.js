const Service = require('../models/service.model');

// Public: Lấy tất cả dịch vụ
// GET /api/services?category=&search=
module.exports.getAll = async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = { isActive: true };
        if (category) filter.category = category;
        if (search)   filter.name = { $regex: search, $options: 'i' };

        const services = await Service.find(filter).sort({ category: 1, name: 1 });
        res.status(200).json({ services });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Public: Chi tiết 1 dịch vụ
// GET /api/services/:id
module.exports.getOne = async (req, res) => {
    try {
        const service = await Service.findOne({ _id: req.params.id, isActive: true });
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        res.status(200).json({ service });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Tạo dịch vụ
// POST /api/services
module.exports.create = async (req, res) => {
    try {
        const service = await Service.create(req.body);
        res.status(201).json({ message: 'Tạo dịch vụ thành công!', service });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Admin: Cập nhật dịch vụ
// PUT /api/services/:id
module.exports.update = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id, req.body,
            { returnDocument: 'after', runValidators: true }
        );
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        res.status(200).json({ message: 'Cập nhật thành công!', service });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Admin: Xóa mềm dịch vụ
// DELETE /api/services/:id
module.exports.remove = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id, { isActive: false },
            { returnDocument: 'after' }
        );
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        res.status(200).json({ message: 'Đã xóa dịch vụ.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};