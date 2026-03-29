const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/user.model');
const Doctor   = require('./models/doctor.model');
const Service  = require('./models/service.model');

const SLOTS = [
    '08:00','08:30','09:00','09:30','10:00','10:30',
    '13:00','13:30','14:00','14:30','15:00','15:30','16:00'
];

const SERVICES_DATA = [
    { name: 'Khám tổng quát',    category: 'Khám bệnh',  price: 150000, duration: 30, icon: '🩺', description: 'Kiểm tra sức khỏe định kỳ toàn diện.' },
    { name: 'Tiêm phòng dại',    category: 'Tiêm phòng', price: 120000, duration: 20, icon: '💉', description: 'Vaccine phòng bệnh dại cho chó và mèo.' },
    { name: 'Tiêm phòng 5 bệnh', category: 'Tiêm phòng', price: 200000, duration: 20, icon: '💉', description: 'Vaccine 5 bệnh cho chó (Care, Parvo, Distemper...).' },
    { name: 'Tắm & Grooming',    category: 'Grooming',   price: 200000, duration: 60, icon: '✂️', description: 'Tắm, sấy, cắt tỉa lông chuyên nghiệp.' },
    { name: 'Xét nghiệm máu',    category: 'Xét nghiệm', price: 300000, duration: 45, icon: '🔬', description: 'Xét nghiệm máu toàn phần, sinh hóa.' },
    { name: 'Siêu âm',           category: 'Xét nghiệm', price: 250000, duration: 30, icon: '📡', description: 'Siêu âm ổ bụng chẩn đoán.' },
    { name: 'Chăm sóc răng',     category: 'Khám bệnh',  price: 350000, duration: 45, icon: '🦷', description: 'Vệ sinh răng miệng, lấy cao răng.' },
    { name: 'Phẫu thuật nhỏ',    category: 'Phẫu thuật', price: 800000, duration: 90, icon: '🏥', description: 'Tiểu phẫu: triệt sản, u nang nhỏ...' },
];

async function seed() {
    await mongoose.connect('mongodb://127.0.0.1:27017/db-pet-clinic-shop');
    console.log('Connected to MongoDB');

    // Seed Services
    await Service.deleteMany({});
    await Service.insertMany(SERVICES_DATA);
    console.log(`Seeded ${SERVICES_DATA.length} services`);

    // Seed Doctor users
    const doctorAccounts = [
        { fullName: 'BS. Nguyễn Văn Hùng',  email: 'doctor1@poogi.vn', specialty: 'Nội khoa',   experience: 8  },
        { fullName: 'BS. Trần Thị Mai',      email: 'doctor2@poogi.vn', specialty: 'Ngoại khoa', experience: 12 },
        { fullName: 'BS. Lê Quang Minh',     email: 'doctor3@poogi.vn', specialty: 'Da liễu',    experience: 5  },
    ];

    for (const acc of doctorAccounts) {
        let user = await User.findOne({ email: acc.email });
        if (!user) {
            const hashed = await bcrypt.hash('Doctor@123', 10);
            user = await User.create({
                fullName: acc.fullName,
                email: acc.email,
                password: hashed,
                role: 'Doctor',
                phoneNumber: '0900000000'
            });
        }

        // Tạo Doctor profile nếu chưa có
        const existing = await Doctor.findOne({ user: user._id });
        if (!existing) {
            await Doctor.create({
                user: user._id,
                specialty:    acc.specialty,
                experience:   acc.experience,
                bio:          `Bác sĩ chuyên khoa ${acc.specialty} với ${acc.experience} năm kinh nghiệm.`,
                workSchedule: {
                    monday: SLOTS, tuesday: SLOTS, wednesday: SLOTS,
                    thursday: SLOTS, friday: SLOTS, saturday: SLOTS.slice(0, 8),
                }
            });
        }
        console.log(`Doctor ready: ${acc.fullName} (${acc.email} / Doctor@123)`);
    }

    console.log('\nSeed hoàn tất!');
    process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });