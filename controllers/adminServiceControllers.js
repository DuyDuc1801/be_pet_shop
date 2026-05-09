const Service = require('../models/service.model');

// GET /api/admin/services
module.exports.getAll = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (category) filter.category = category;
        if (search)   filter.name = { $regex: search, $options: 'i' };

        const total    = await Service.countDocuments(filter);
        const services = await Service.find(filter)
            .sort({ category: 1, name: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.status(200).json({ services, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/admin/services
module.exports.create = async (req, res) => {
    try {
        const { name, category, icon, price, duration, description } = req.body;
        if (!name || !category || !price || !duration)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });

        const existing = await Service.findOne({ name: name.trim() });
        if (existing)
            return res.status(400).json({ message: 'Tên dịch vụ đã tồn tại.' });

        const service = await Service.create({
            name: name.trim(), category, icon: icon || '🩺',
            price: Number(price), duration: Number(duration),
            description: description || '', isActive: true,
        });
        res.status(201).json({ message: 'Tạo dịch vụ thành công!', service });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// PUT /api/admin/services/:id
module.exports.update = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id, req.body, { returnDocument: 'after', runValidators: true }
        );
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        res.status(200).json({ message: 'Cập nhật thành công!', service });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// DELETE /api/admin/services/:id
module.exports.remove = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        res.status(200).json({ message: 'Đã xóa dịch vụ.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/admin/services/:id/toggle
module.exports.toggle = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: 'Không tìm thấy dịch vụ.' });
        service.isActive = !service.isActive;
        await service.save();
        res.status(200).json({ message: `Dịch vụ đã ${service.isActive ? 'kích hoạt' : 'ẩn'}.`, service });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};