const nodemailer = require('nodemailer');

const sendMail = async ({ to, subject, html }) => {
    try {
        // Cấu hình transporter (người gửi) sử dụng Gmail
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true cho port 465, false cho port 587
            auth: {
                user: process.env.EMAIL_USER, // Email của bạn
                pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng (App Password)
            }
        });

        // Tùy chọn nội dung email
        const mailOptions = {
            from: `"PooGi PetCare" <${process.env.EMAIL_USER}>`, // Tên hiển thị
            to: to, // Email người nhận
            subject: subject, // Tiêu đề
            html: html // Nội dung HTML
        };

        // Thực hiện gửi
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Đã gửi email thành công đến:', to);
        return info;
    } catch (error) {
        console.error('❌ Lỗi khi gửi email:', error.message);
        // Tùy chọn: Bạn có thể throw error hoặc return false tùy logic bạn muốn
    }
};

module.exports = sendMail;