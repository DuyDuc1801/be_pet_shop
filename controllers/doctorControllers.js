const Doctor  = require('../models/doctor.model');
const Service = require('../models/service.model');

// ── Public: Lấy tất cả bác sĩ (có filter theo serviceId) ─────────
// GET /api/doctors?serviceId=xxx&specialty=xxx&search=xxx
module.exports.getAll = async (req, res) => {
    try {
        const { serviceId, specialty, search } = req.query;
        const filter = {};

        // Filter theo dịch vụ — chỉ lấy bác sĩ có dịch vụ này
        if (serviceId) filter.services = serviceId;
        if (specialty) filter.specialty = specialty;

        let doctors = await Doctor.find(filter)
            .populate('user', 'fullName email avatar phoneNumber')
            .populate('services', 'name icon category');  // populate services để FE hiển thị

        // Filter theo tên nếu có search
        if (search) {
            const keyword = search.toLowerCase();
            doctors = doctors.filter(d =>
                d.user?.fullName?.toLowerCase().includes(keyword) ||
                d.specialty?.toLowerCase().includes(keyword)
            );
        }

        res.status(200).json({ doctors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Public: Chi tiết 1 bác sĩ ────────────────────────────────────
// GET /api/doctors/:id
module.exports.getOne = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
            .populate('user', 'fullName email avatar phoneNumber')
            .populate('services', 'name icon category price duration');

        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });
        res.status(200).json({ doctor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ── Admin: Tạo bác sĩ ────────────────────────────────────────────
module.exports.create = async (req, res) => {
    try {
        const doctor = await Doctor.create(req.body);
        const populated = await Doctor.findById(doctor._id)
            .populate('user', 'fullName email')
            .populate('services', 'name icon');
        res.status(201).json({ message: 'Tạo bác sĩ thành công!', doctor: populated });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ── Admin: Cập nhật bác sĩ ───────────────────────────────────────
module.exports.update = async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id, req.body,
            { returnDocument: 'after', runValidators: true }
        ).populate('user', 'fullName email')
         .populate('services', 'name icon');

        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });
        res.status(200).json({ message: 'Cập nhật thành công!', doctor });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ── Admin: Xóa bác sĩ ────────────────────────────────────────────
module.exports.remove = async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id);
        if (!doctor) return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });
        res.status(200).json({ message: 'Đã xóa bác sĩ.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};