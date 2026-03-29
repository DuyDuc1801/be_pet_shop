const Cart    = require('../models/cart.model');
const Product = require('../models/product.model');

const populateCart = (query) =>
    query.populate({ path: 'items.product', select: 'name images price salePrice stock isActive category' });

// Lấy giỏ hàng
module.exports.getCart = async (req, res) => {
    try {
        let cart = await populateCart(Cart.findOne({ user: req.user.id }));
        if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });
        res.status(200).json({ cart });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Thêm / tăng số lượng
module.exports.addItem = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const product = await Product.findOne({ _id: productId, isActive: true });
        if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại.' });
        if (product.stock < 1) return res.status(400).json({ message: 'Sản phẩm đã hết hàng.' });

        const price = product.salePrice ?? product.price;
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });

        const idx = cart.items.findIndex(i => i.product.toString() === productId);
        if (idx > -1) {
            const newQty = cart.items[idx].quantity + Number(quantity);
            if (newQty > product.stock)
                return res.status(400).json({ message: `Chỉ còn ${product.stock} sản phẩm trong kho.` });
            cart.items[idx].quantity = newQty;
            cart.items[idx].price    = price;
        } else {
            cart.items.push({ product: productId, quantity: Number(quantity), price });
        }

        await cart.save();
        const updated = await populateCart(Cart.findById(cart._id));
        res.status(200).json({ message: 'Đã thêm vào giỏ hàng!', cart: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật số lượng
module.exports.updateItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống.' });

        const idx = cart.items.findIndex(i => i.product.toString() === productId);
        if (idx === -1) return res.status(404).json({ message: 'Sản phẩm không có trong giỏ.' });

        if (Number(quantity) <= 0) {
            cart.items.splice(idx, 1);
        } else {
            const product = await Product.findById(productId);
            if (Number(quantity) > product.stock)
                return res.status(400).json({ message: `Chỉ còn ${product.stock} sản phẩm trong kho.` });
            cart.items[idx].quantity = Number(quantity);
        }

        await cart.save();
        const updated = await populateCart(Cart.findById(cart._id));
        res.status(200).json({ cart: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa 1 sản phẩm khỏi giỏ
module.exports.removeItem = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống.' });

        cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
        await cart.save();
        const updated = await populateCart(Cart.findById(cart._id));
        res.status(200).json({ message: 'Đã xóa khỏi giỏ hàng.', cart: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa toàn bộ giỏ
module.exports.clearCart = async (req, res) => {
    try {
        await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
        res.status(200).json({ message: 'Đã xóa toàn bộ giỏ hàng.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};