const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tên sản phẩm là bắt buộc"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Mô tả sản phẩm không được để trống"]
    },
    price: {
        type: Number,
        required: [true, "Giá sản phẩm là bắt buộc"],
        min: [0, "Giá không được nhỏ hơn 0"]
    },
    category: {
        type: String,
        required: [true, "Vui lòng chọn danh mục sản phẩm"],
    },
    brand: {
        type: String,
        default: "Unknown"
    },
    stock: {
        type: Number,
        required: [true, "Số lượng tồn kho là bắt buộc"],
        default: 0
    },
    image: {
        type: String,
        default: "default-product.jpg"
    },
    status: {
        type: String,
        enum: ["available", "out_of_stock"],
        default: "available"
    }
}, { 
    timestamps: true 
});

const Product = mongoose.model("products", productSchema);
module.exports = Product;