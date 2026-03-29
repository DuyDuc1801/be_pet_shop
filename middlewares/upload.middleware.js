const multer = require('multer');
const { CloudinaryStorage }  = require('multer-storage-cloudinary');
const cloudinary = require('../configs/cloudinary');

//Tạo storage cho từng loại ảnh
function makeStorage(folder, allowedFormats = ['jpg', 'jpeg', 'png', 'webp']) {
    return new CloudinaryStorage({
        cloudinary,
        params: {
            folder:          `poogi/${folder}`,
            allowed_formats: allowedFormats,
            transformation:  [{ quality: 'auto', fetch_format: 'auto' }], // tự tối ưu
        },
    });
}

// Giới hạn file
const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// Filter: chỉ cho ảnh
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ được upload file ảnh (jpg, png, webp).'), false);
};

// Export middleware cho từng phần
// Sản phẩm — tối đa 5 ảnh
const uploadProduct = multer({
    storage: makeStorage('products'),
    limits,
    fileFilter: imageFilter,
}).array('images', 5);

// Avatar người dùng — 1 ảnh
const uploadAvatar = multer({
    storage: makeStorage('avatars'),
    limits,
    fileFilter: imageFilter,
}).single('avatar');

// Ảnh bác sĩ — 1 ảnh
const uploadDoctor = multer({
    storage: makeStorage('doctors'),
    limits,
    fileFilter: imageFilter,
}).single('photo');

// Wrapper: biến multer callback thành Promise
// Giúp dùng async/await trong controller thay vì callback lồng nhau
function handleUpload(uploadFn) {
    return (req, res, next) => {
        uploadFn(req, res, (err) => {
            if (!err) return next();
            if (err.code === 'LIMIT_FILE_SIZE')
                return res.status(400).json({ message: 'File quá lớn. Tối đa 5MB.' });
            return res.status(400).json({ message: err.message });
        });
    };
}

module.exports = {
    uploadProduct: handleUpload(uploadProduct),
    uploadAvatar: handleUpload(uploadAvatar),
    uploadDoctor: handleUpload(uploadDoctor),
};