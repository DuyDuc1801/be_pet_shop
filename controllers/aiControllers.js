const { GoogleGenerativeAI } = require('@google/generative-ai');
const MedicalRecord = require('../models/medicalRecord.model');
const Appointment   = require('../models/appointment.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── System prompt riêng cho PooGi ────────────────────────────────
const POOGI_SYSTEM = `Bạn là PooGi AI — trợ lý sức khỏe thú cưng thông minh của phòng khám PooGi Pet Clinic.
Nguyên tắc hoạt động:
- Luôn trả lời bằng tiếng Việt, thân thiện như một bác sĩ thú y nhiệt tình
- Phân tích kỹ triệu chứng trước khi đưa ra nhận xét
- Với triệu chứng NGUY HIỂM (khó thở, co giật, chảy máu nhiều, bất tỉnh) → yêu cầu ĐẾN KHÁM NGAY
- Luôn nhấn mạnh đây là tư vấn sơ bộ, không thay thế khám trực tiếp
- Dùng từ "có thể", "nghi ngờ", không chẩn đoán chắc chắn
- Cuối mỗi phân tích, luôn gợi ý đặt lịch khám tại PooGi nếu cần thiết`;

// ── POST /api/ai/diagnose ─────────────────────────────────────────
// Chẩn đoán theo flow có hướng dẫn + hỗ trợ ảnh base64
module.exports.diagnose = async (req, res) => {
    try {
        const {
            petType, petAge, petWeight, petBreed,
            symptoms, duration, additionalInfo,
            imageBase64, imageMimeType,  // ảnh thú cưng (optional)
        } = req.body;

        if (!symptoms?.trim() || symptoms.trim().length < 10)
            return res.status(400).json({ message: 'Vui lòng mô tả triệu chứng chi tiết hơn (ít nhất 10 ký tự).' });

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const textPrompt = `${POOGI_SYSTEM}

Thông tin thú cưng cần chẩn đoán:
- Loài: ${petType || 'Không rõ'}
- Giống: ${petBreed || 'Không rõ'}
- Tuổi: ${petAge || 'Không rõ'}
- Cân nặng: ${petWeight || 'Không rõ'}
- Triệu chứng: ${symptoms}
- Thời gian xuất hiện: ${duration || 'Không rõ'}
- Thông tin thêm: ${additionalInfo || 'Không có'}
${imageBase64 ? '- Đã đính kèm ảnh thú cưng để phân tích trực quan.' : ''}

Hãy phân tích và trả về đúng định dạng JSON sau (KHÔNG có markdown, KHÔNG có backtick):
{
  "urgency": "low|medium|high|emergency",
  "urgencyText": "Mô tả mức độ khẩn cấp",
  "urgencyColor": "#22c55e|#f59e0b|#ef4444|#dc2626",
  "possibleConditions": [
    { "name": "Tên bệnh", "probability": "cao|trung bình|thấp", "description": "Mô tả ngắn gọn" }
  ],
  "recommendation": "Khuyến nghị tổng thể",
  "homeCare": ["Bước chăm sóc tại nhà 1", "Bước 2"],
  "warningSigns": ["Dấu hiệu cần đến bác sĩ ngay"],
  "imageAnalysis": "Nhận xét về ảnh nếu có, null nếu không có ảnh",
  "shouldBook": true,
  "bookingReason": "Lý do nên đặt lịch khám",
  "disclaimer": "Lưu ý quan trọng"
}`;

        let result;
        if (imageBase64 && imageMimeType) {
            // Gửi kèm ảnh
            result = await model.generateContent([
                textPrompt,
                { inlineData: { data: imageBase64, mimeType: imageMimeType } },
            ]);
        } else {
            result = await model.generateContent(textPrompt);
        }

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return res.status(500).json({ message: 'AI không thể phân tích, vui lòng thử lại.' });

        const aiResult = JSON.parse(jsonMatch[0]);
        res.status(200).json({ result: aiResult });
    } catch (err) {
        console.error('AI diagnose error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/ai/chat ─────────────────────────────────────────────
// Chat tự do — có thể kèm context HSBA cũ của thú cưng
module.exports.chat = async (req, res) => {
    try {
        const { message, history = [], petContext } = req.body;
        // petContext: { petName, petType, recentRecords[] } — truyền từ FE nếu có

        if (!message?.trim())
            return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build system context với thông tin thú cưng nếu có
        let systemContext = POOGI_SYSTEM;
        if (petContext?.petName) {
            systemContext += `\n\nThông tin thú cưng đang hỏi về: ${petContext.petName} (${petContext.petType || 'Không rõ loài'})`;
        }
        if (petContext?.recentRecords?.length > 0) {
            const records = petContext.recentRecords.slice(0, 3).map(r =>
                `- Ngày ${r.date}: ${r.diagnosis}${r.treatment ? ' → ' + r.treatment : ''}`
            ).join('\n');
            systemContext += `\n\nLịch sử khám gần đây:\n${records}`;
            systemContext += `\n\nHãy tham khảo lịch sử bệnh án trên khi trả lời để cho lời khuyên phù hợp hơn.`;
        }

        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: systemContext }],
                },
                {
                    role: 'model',
                    parts: [{ text: `Xin chào! Tôi là PooGi AI 🐾 Tôi có thể giúp bạn tư vấn về sức khỏe thú cưng.${petContext?.petName ? ` Tôi thấy bạn đang hỏi về bé **${petContext.petName}** — tôi đã xem qua lịch sử khám của bé rồi!` : ''} Hãy đặt câu hỏi nhé!` }],
                },
                ...history.slice(-10).map(h => ({
                    role: h.role,
                    parts: [{ text: h.content }],
                })),
            ],
        });

        const result   = await chat.sendMessage(message);
        const response = result.response.text();

        res.status(200).json({ response, role: 'model' });
    } catch (err) {
        console.error('AI chat error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/ai/analyze-image ────────────────────────────────────
// Phân tích ảnh thú cưng độc lập (không kèm triệu chứng)
module.exports.analyzeImage = async (req, res) => {
    try {
        const { imageBase64, imageMimeType, petType, question } = req.body;

        if (!imageBase64 || !imageMimeType)
            return res.status(400).json({ message: 'Vui lòng gửi kèm ảnh.' });

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `${POOGI_SYSTEM}

Bạn là chuyên gia phân tích hình ảnh thú cưng. Hãy quan sát kỹ ảnh được đính kèm.
Loài thú cưng: ${petType || 'Chưa biết'}
Câu hỏi của chủ nhân: ${question || 'Hãy nhận xét tổng quan về thú cưng trong ảnh'}

Hãy phân tích:
1. Tình trạng bên ngoài: lông, mắt, da, tư thế, biểu hiện
2. Các dấu hiệu bất thường nhìn thấy được (nếu có)
3. Đánh giá tổng thể: thú cưng có vẻ khỏe mạnh / cần chú ý / cần khám
4. Khuyến nghị

Trả lời thân thiện, ngắn gọn, dễ hiểu bằng tiếng Việt.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType: imageMimeType } },
        ]);

        const response = result.response.text();
        res.status(200).json({ analysis: response });
    } catch (err) {
        console.error('AI analyze-image error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ── POST /api/ai/quick-advice ────────────────────────────────────
// Tư vấn nhanh theo flow có hướng dẫn (không cần mô tả dài)
module.exports.quickAdvice = async (req, res) => {
    try {
        const { category, petType, symptomKey } = req.body;
        // category: 'diet'|'vaccine'|'behavior'|'emergency'|'grooming'
        // symptomKey: key định danh triệu chứng phổ biến

        const CATEGORIES = {
            diet:      'dinh dưỡng và chế độ ăn',
            vaccine:   'lịch tiêm phòng và phòng bệnh',
            behavior:  'hành vi và tâm lý thú cưng',
            emergency: 'xử lý tình huống khẩn cấp',
            grooming:  'vệ sinh và chăm sóc lông',
        };

        const topic = CATEGORIES[category] || category;
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `${POOGI_SYSTEM}

Chủ nhân có ${petType || 'thú cưng'} đang hỏi về chủ đề: ${topic}
${symptomKey ? `Triệu chứng/vấn đề cụ thể: ${symptomKey}` : ''}

Hãy cung cấp:
1. Thông tin cơ bản cần biết (3-4 điểm chính)
2. Lưu ý quan trọng
3. Khi nào cần đến phòng khám
4. Tips hữu ích tại nhà

Định dạng: JSON
{
  "title": "Tiêu đề tư vấn",
  "summary": "Tóm tắt 1-2 câu",
  "keyPoints": ["Điểm 1", "Điểm 2", "Điểm 3"],
  "warnings": ["Cảnh báo 1"],
  "homeTips": ["Mẹo 1", "Mẹo 2"],
  "whenToVisit": "Khi nào cần đến khám",
  "relatedTopics": ["Chủ đề liên quan 1", "Chủ đề 2"]
}`;

        const result = await model.generateContent(prompt);
        const text   = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch)
            return res.status(500).json({ message: 'AI không thể tư vấn lúc này, thử lại sau.' });

        res.status(200).json({ advice: JSON.parse(jsonMatch[0]) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── GET /api/ai/pet-context/:customerId ──────────────────────────
// Lấy context thú cưng từ HSBA để truyền vào chat
module.exports.getPetContext = async (req, res) => {
    try {
        // Lấy các HSBA gần nhất của khách hàng này
        const records = await MedicalRecord.find({
            customer: req.user.id,
            status:   'completed',
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('pet.name pet.type diagnosis treatment createdAt');

        // Group theo tên thú cưng
        const petsMap = {};
        records.forEach(r => {
            const name = r.pet?.name || 'Không tên';
            if (!petsMap[name]) {
                petsMap[name] = { petName: name, petType: r.pet?.type, recentRecords: [] };
            }
            petsMap[name].recentRecords.push({
                date:      new Date(r.createdAt).toLocaleDateString('vi-VN'),
                diagnosis: r.diagnosis,
                treatment: r.treatment,
            });
        });

        res.status(200).json({ pets: Object.values(petsMap) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};