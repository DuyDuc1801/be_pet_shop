require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('./models/product.model');

const MONGO_URI = process.env.MONGO_URI;

const products = [
  // Thức ăn
  { name: 'Royal Canin Mini Adult 2kg', category: 'Thức ăn', petType: 'Chó', price: 285000, salePrice: 259000, stock: 50, sold: 120, rating: 4.8, reviewCount: 34, images: ['https://placehold.co/400x400/FFB347/fff?text=🐕'], tags: ['hạt khô', 'chó nhỏ', 'royal canin'] },
  { name: 'Royal Canin Persian Adult 400g', category: 'Thức ăn', petType: 'Mèo', price: 145000, stock: 40, sold: 89, rating: 4.7, reviewCount: 21, images: ['https://placehold.co/400x400/C8A2C8/fff?text=🐈'], tags: ['hạt khô', 'mèo Ba Tư', 'royal canin'] },
  { name: 'Pedigree Xương Thịt Gà 1.5kg', category: 'Thức ăn', petType: 'Chó', price: 120000, salePrice: 99000, stock: 80, sold: 200, rating: 4.5, reviewCount: 56, images: ['https://placehold.co/400x400/F4A460/fff?text=🦴'], tags: ['hạt khô', 'pedigree', 'tiết kiệm'] },
  { name: 'Whiskas Cá Thu Sốt 85g (12 gói)', category: 'Thức ăn', petType: 'Mèo', price: 156000, salePrice: 140000, stock: 60, sold: 310, rating: 4.6, reviewCount: 78, images: ['https://placehold.co/400x400/87CEEB/fff?text=🐟'], tags: ['pate', 'mèo', 'whiskas'] },
  { name: 'Ganador Puppy 7kg', category: 'Thức ăn', petType: 'Chó', price: 390000, stock: 25, sold: 45, rating: 4.4, reviewCount: 12, images: ['https://placehold.co/400x400/DEB887/fff?text=🐶'], tags: ['chó con', 'hạt khô', 'ganador'] },

  // Phụ kiện
  { name: 'Vòng cổ da thật dành cho chó', category: 'Phụ kiện', petType: 'Chó', price: 185000, salePrice: 150000, stock: 30, sold: 67, rating: 4.3, reviewCount: 19, images: ['https://placehold.co/400x400/CD853F/fff?text=🏷️'], tags: ['vòng cổ', 'da', 'thời trang'] },
  { name: 'Dây dắt chó tự rút 5m', category: 'Phụ kiện', petType: 'Chó', price: 220000, stock: 45, sold: 88, rating: 4.6, reviewCount: 23, images: ['https://placehold.co/400x400/708090/fff?text=🐾'], tags: ['dây dắt', 'tự rút', 'tiện lợi'] },
  { name: 'Lồng vận chuyển mèo size M', category: 'Phụ kiện', petType: 'Mèo', price: 450000, salePrice: 399000, stock: 15, sold: 34, rating: 4.7, reviewCount: 11, images: ['https://placehold.co/400x400/98FB98/fff?text=🏠'], tags: ['lồng', 'vận chuyển', 'mèo'] },
  { name: 'Bát ăn inox đôi có đế cao su', category: 'Phụ kiện', petType: 'Cả hai', price: 95000, stock: 100, sold: 250, rating: 4.8, reviewCount: 67, images: ['https://placehold.co/400x400/C0C0C0/fff?text=🥣'], tags: ['bát ăn', 'inox', 'chống trượt'] },
  { name: 'Giường nằm tròn lông thỏ 50cm', category: 'Phụ kiện', petType: 'Cả hai', price: 320000, salePrice: 280000, stock: 20, sold: 43, rating: 4.9, reviewCount: 28, images: ['https://placehold.co/400x400/FFB6C1/fff?text=🛏️'], tags: ['giường', 'lông thỏ', 'ấm áp'] },

  // Thuốc & Vitamin
  { name: 'Nexgard Spectra (cho chó 2-3.5kg)', category: 'Thuốc & Vitamin', petType: 'Chó', price: 185000, stock: 50, sold: 140, rating: 4.9, reviewCount: 45, images: ['https://placehold.co/400x400/90EE90/fff?text=💊'], tags: ['ve rận', 'bọ chét', 'nexgard'] },
  { name: 'Frontline Plus mèo (3 ống)', category: 'Thuốc & Vitamin', petType: 'Mèo', price: 210000, salePrice: 190000, stock: 35, sold: 95, rating: 4.7, reviewCount: 32, images: ['https://placehold.co/400x400/98FB98/fff?text=🧪'], tags: ['bọ chét', 'frontline', 'nhỏ gáy'] },
  { name: 'Vitamin tổng hợp Viyo cho chó', category: 'Thuốc & Vitamin', petType: 'Chó', price: 135000, stock: 60, sold: 78, rating: 4.5, reviewCount: 18, images: ['https://placehold.co/400x400/FFA07A/fff?text=🌟'], tags: ['vitamin', 'viyo', 'tăng đề kháng'] },

  // Vệ sinh
  { name: 'Sữa tắm chó Biogroom Natural Oat', category: 'Vệ sinh', petType: 'Chó', price: 175000, salePrice: 149000, stock: 40, sold: 112, rating: 4.6, reviewCount: 38, images: ['https://placehold.co/400x400/F5DEB3/fff?text=🛁'], tags: ['sữa tắm', 'dưỡng lông', 'biogroom'] },
  { name: 'Khăn ướt vệ sinh thú cưng 80 tờ', category: 'Vệ sinh', petType: 'Cả hai', price: 65000, stock: 120, sold: 340, rating: 4.4, reviewCount: 89, images: ['https://placehold.co/400x400/E0FFFF/fff?text=🧻'], tags: ['khăn ướt', 'vệ sinh', 'tiện lợi'] },
  { name: 'Bàn chải đánh răng ngón tay', category: 'Vệ sinh', petType: 'Cả hai', price: 45000, stock: 80, sold: 67, rating: 4.2, reviewCount: 14, images: ['https://placehold.co/400x400/ADD8E6/fff?text=🦷'], tags: ['đánh răng', 'vệ sinh răng', 'ngón tay'] },
  { name: 'Lược chải lông 2 chiều Fine/Coarse', category: 'Vệ sinh', petType: 'Cả hai', price: 85000, salePrice: 72000, stock: 55, sold: 156, rating: 4.7, reviewCount: 42, images: ['https://placehold.co/400x400/D3D3D3/fff?text=✨'], tags: ['lược', 'chải lông', 'chống rụng'] },

  // Đồ chơi
  { name: 'Cần câu lông vũ có đèn LED cho mèo', category: 'Đồ chơi', petType: 'Mèo', price: 95000, salePrice: 79000, stock: 70, sold: 233, rating: 4.8, reviewCount: 61, images: ['https://placehold.co/400x400/DDA0DD/fff?text=🪄'], tags: ['cần câu', 'led', 'tương tác'] },
  { name: 'Bóng cao su nhai gặm có tiếng kêu', category: 'Đồ chơi', petType: 'Chó', price: 55000, stock: 90, sold: 189, rating: 4.3, reviewCount: 47, images: ['https://placehold.co/400x400/FF6347/fff?text=⚽'], tags: ['bóng', 'nhai gặm', 'tiếng kêu'] },
  { name: 'Cột cào móng sisal 60cm cho mèo', category: 'Đồ chơi', petType: 'Mèo', price: 265000, salePrice: 230000, stock: 18, sold: 56, rating: 4.6, reviewCount: 22, images: ['https://placehold.co/400x400/8FBC8F/fff?text=🌵'], tags: ['cào móng', 'sisal', 'nội thất'] },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Kết nối MongoDB');

    await Product.deleteMany({});
    const inserted = await Product.insertMany(products);
    console.log(`Đã tạo ${inserted.length} sản phẩm mẫu`);

    await mongoose.disconnect();
    console.log('Seed tuần 4 hoàn tất!');
}

seed().catch(console.error);