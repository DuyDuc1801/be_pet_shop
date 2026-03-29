require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/user.model');
const Doctor   = require('./models/doctor.model');
const Service  = require('./models/service.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/poogi-pet-clinic';

// Map chuyên khoa → tên các dịch vụ bác sĩ đó làm được
const SPECIALTY_SERVICES = {
    'Nội khoa': [
        'Khám tổng quát định kỳ',
        'Khám cấp cứu',
        'Xét nghiệm máu tổng quát',
        'Xét nghiệm ký sinh trùng',
        'Siêu âm ổ bụng',
        'Tiêm vaccine 5 bệnh cho chó',
        'Tiêm vaccine dại',
        'Tiêm vaccine 3 bệnh cho mèo',
    ],
    'Ngoại khoa': [
        'Khám tổng quát định kỳ',
        'Khám cấp cứu',
        'Triệt sản chó/mèo cái',
        'Triệt sản chó/mèo đực',
        'Xét nghiệm máu tổng quát',
        'Siêu âm ổ bụng',
    ],
    'Da liễu': [
        'Khám tổng quát định kỳ',
        'Xét nghiệm ký sinh trùng',
        'Tắm & Sấy khô',
        'Cắt tỉa lông theo yêu cầu',
    ],
    'Răng hàm mặt': [
        'Khám tổng quát định kỳ',
        'Lấy cao răng siêu âm',
    ],
};

const doctorData = [
    {
        email: 'doctor1@poogi.vn', fullName: 'Nguyễn Văn An',
        specialty: 'Nội khoa',
        degree: 'Tiến sĩ Thú y - ĐH Nông Lâm TP.HCM',
        bio: 'Bác sĩ Nguyễn Văn An có hơn 8 năm kinh nghiệm trong lĩnh vực nội khoa thú y. Chuyên điều trị các bệnh lý tiêu hóa, hô hấp và tim mạch cho chó mèo.',
        workSchedule: {
            monday:    ['08:00', '09:00', '10:00', '14:00', '15:00'],
            tuesday:   ['08:00', '09:00', '10:00', '14:00', '15:00'],
            wednesday: ['08:00', '09:00', '10:00'],
            thursday:  ['14:00', '15:00', '16:00'],
            friday:    ['08:00', '09:00', '10:00', '14:00', '15:00'],
        },
    },
    {
        email: 'doctor2@poogi.vn', fullName: 'Trần Thị Bích',
        specialty: 'Ngoại khoa',
        degree: 'Thạc sĩ Thú y - ĐH Y Dược TP.HCM',
        bio: 'Bác sĩ Trần Thị Bích là chuyên gia hàng đầu trong lĩnh vực phẫu thuật thú y tại PooGi. Với hơn 6 năm kinh nghiệm phẫu thuật.',
        workSchedule: {
            tuesday:  ['09:00', '10:00', '11:00'],
            thursday: ['09:00', '10:00', '11:00'],
            saturday: ['08:00', '09:00', '10:00', '11:00'],
        },
    },
    {
        email: 'doctor3@poogi.vn', fullName: 'Lê Minh Châu',
        specialty: 'Da liễu',
        degree: 'Bác sĩ Thú y - ĐH Cần Thơ',
        bio: 'Bác sĩ Lê Minh Châu chuyên về da liễu và dinh dưỡng thú y. Với 5 năm kinh nghiệm điều trị các bệnh về da phức tạp.',
        workSchedule: {
            monday:    ['14:00', '15:00', '16:00'],
            wednesday: ['14:00', '15:00', '16:00'],
            friday:    ['14:00', '15:00', '16:00'],
            saturday:  ['09:00', '10:00', '11:00'],
        },
    },
    {
        email: 'doctor4@poogi.vn', fullName: 'Phạm Quốc Dũng',
        specialty: 'Răng hàm mặt',
        degree: 'Thạc sĩ Thú y - ĐH Nông nghiệp Hà Nội',
        bio: 'Bác sĩ Phạm Quốc Dũng là chuyên gia nha khoa thú y với 7 năm kinh nghiệm xử lý các vấn đề về răng miệng.',
        workSchedule: {
            tuesday:  ['08:00', '09:00', '10:00', '11:00'],
            thursday: ['08:00', '09:00', '10:00', '11:00'],
            saturday: ['14:00', '15:00', '16:00'],
        },
    },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Kết nối MongoDB');

    // Lấy tất cả services để map tên → _id
    const allServices = await Service.find({});
    if (allServices.length === 0) {
        console.log('❌ Chưa có services! Chạy seedDoctorsServices.js trước.');
        await mongoose.disconnect();
        return;
    }

    // Tạo map: tên service → _id
    const serviceMap = {};
    allServices.forEach(s => { serviceMap[s.name] = s._id; });
    console.log(`📋 Tìm thấy ${allServices.length} dịch vụ`);

    // Xóa doctors cũ
    await Doctor.deleteMany({});
    console.log('🗑️  Đã xóa doctors cũ');

    for (const d of doctorData) {
        // Tìm hoặc tạo user
        let user = await User.findOne({ email: d.email });
        if (!user) {
            const hashed = await bcrypt.hash('Doctor@123', 10);
            user = await User.create({
                fullName: d.fullName, email: d.email,
                password: hashed, role: 'Doctor', phoneNumber: '0900000000',
            });
            console.log(`   👤 Tạo user: ${d.email}`);
        }

        // Lấy serviceIds theo chuyên khoa
        const serviceNames = SPECIALTY_SERVICES[d.specialty] || [];
        const serviceIds   = serviceNames
            .map(name => serviceMap[name])
            .filter(Boolean);

        await Doctor.create({
            user:         user._id,
            specialty:    d.specialty,
            degree:       d.degree,
            bio:          d.bio,
            photo:        '',
            services:     serviceIds,    // ← gán dịch vụ
            workSchedule: d.workSchedule,
        });

        console.log(`   🩺 BS. ${d.fullName} (${d.specialty}) → ${serviceIds.length} dịch vụ`);
    }

    console.log(`\n✅ Seed hoàn tất! ${doctorData.length} bác sĩ`);
    console.log('\nTài khoản bác sĩ:');
    doctorData.forEach(d => console.log(`  ${d.email} / Doctor@123`));

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('❌ Lỗi:', err.message);
    mongoose.disconnect();
});