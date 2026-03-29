const cloudinary = require('../configs/cloudinary');
const User       = require('../models/user.model');
const Product    = require('../models/product.model');
const Doctor     = require('../models/doctor.model');

// Upload ảnh sản phẩm
// POST /api/upload/product/:id
// Body: multipart/form-data, field: images[] (tối đa 5 file)
module.exports.uploadProductImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ message: 'Không có file nào được upload.' });
        const urls = req.files.map(f => f.path); // Cloudinary trả về URL trong f.path

        // Append vào mảng images hiện tại của product
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $push: { images: { $each: urls } } },
            { returnDocument: 'after' }
        );

        if (!product) {
            // Xóa ảnh vừa upload nếu product không tồn tại
            await Promise.all(req.files.map(f => cloudinary.uploader.destroy(f.filename)));
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
        }

        res.status(200).json({ message: 'Upload thành công!', images: urls, product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa 1 ảnh sản phẩm
// DELETE /api/upload/product/:id/image
// Body: { imageUrl: "https://res.cloudinary.com/..." }
module.exports.deleteProductImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        // Lấy public_id từ URL Cloudinary
        // VD: https://res.cloudinary.com/demo/image/upload/v123/poogi/products/abc.jpg
        //     → public_id = poogi/products/abc
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];                    // abc.jpg
        const folder = parts[parts.length - 2];                    // products
        const publicId = `poogi/${folder}/${filename.split('.')[0]}`; // poogi/products/abc

        await cloudinary.uploader.destroy(publicId);

        // Xóa URL khỏi mảng images của product
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $pull: { images: imageUrl } },
            { returnDocument: 'after' }
        );

        res.status(200).json({ message: 'Đã xóa ảnh.', product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Upload avatar người dùng
// POST /api/upload/avatar
// Body: multipart/form-data, field: avatar (1 file)
module.exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'Không có file nào được upload.' });

        const avatarUrl = req.file.path;

        // Xóa avatar cũ trên Cloudinary nếu có
        if (req.user.avatar) {
            const parts    = req.user.avatar.split('/');
            const filename = parts[parts.length - 1];
            const oldPublicId = `poogi/avatars/${filename.split('.')[0]}`;
            await cloudinary.uploader.destroy(oldPublicId).catch(() => {}); // bỏ qua lỗi nếu không tìm thấy
        }
        console.log(req.user);
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatar: avatarUrl },
            {returnDocument: 'after'}
        ).select('-password');

        res.status(200).json({ message: 'Cập nhật avatar thành công!', avatarUrl, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Upload ảnh bác sĩ
// POST /api/upload/doctor/:id
// Body: multipart/form-data, field: photo (1 file)
module.exports.uploadDoctorPhoto = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'Không có file nào được upload.' });

        const photoUrl = req.file.path;

        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { photo: photoUrl },
            { returnDocument: 'after' }
        ).populate('user', 'fullName email');

        if (!doctor) {
            await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
            return res.status(404).json({ message: 'Không tìm thấy bác sĩ.' });
        }

        res.status(200).json({ message: 'Cập nhật ảnh bác sĩ thành công!', photoUrl, doctor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};