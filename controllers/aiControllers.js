const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Prompt system cho bác sĩ thú y AI ───────────────────────────
const SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên về sức khỏe thú cưng tại phòng khám PooGi. 
Nhiệm vụ của bạn là:
1. Phân tích triệu chứng mà chủ thú cưng mô tả
2. Đưa ra các bệnh có thể gặp (theo xác suất cao → thấp)
3. Khuyến nghị có nên đến khám bác sĩ không và mức độ khẩn cấp
4. Gợi ý chăm sóc tạm thời tại nhà nếu có thể
5. Luôn nhắc nhở rằng đây chỉ là tư vấn sơ bộ, không thay thế khám trực tiếp

Quy tắc:
- Trả lời bằng tiếng Việt, thân thiện và dễ hiểu
- Không chẩn đoán chính xác 100%, luôn dùng từ "có thể", "nghi ngờ"
- Với triệu chứng nguy hiểm (khó thở, co giật, chảy máu nhiều) → yêu cầu đến khám NGAY
- Định dạng response theo JSON với cấu trúc rõ ràng`;

// ── POST /api/ai/diagnose ────────────────────────────────────────
module.exports.diagnose = async (req, res) => {
    try {
        const { petType, petAge, petWeight, symptoms, duration, additionalInfo } = req.body;

        if (!symptoms || symptoms.trim().length < 10) {
            return res.status(400).json({ message: 'Vui lòng mô tả triệu chứng chi tiết hơn (ít nhất 10 ký tự).' });
        }

        const prompt = `
        ${SYSTEM_PROMPT}

        Thông tin thú cưng:
        - Loài: ${petType || 'Không rõ'}
        - Tuổi: ${petAge || 'Không rõ'}
        - Cân nặng: ${petWeight || 'Không rõ'}
        - Triệu chứng: ${symptoms}
        - Thời gian xuất hiện: ${duration || 'Không rõ'}
        - Thông tin thêm: ${additionalInfo || 'Không có'}

        Hãy phân tích và trả về JSON với cấu trúc sau:
        {
        "urgency": "low" | "medium" | "high" | "emergency",
        "urgencyText": "Mô tả mức độ khẩn cấp",
        "possibleConditions": [
            { "name": "Tên bệnh", "probability": "cao/trung bình/thấp", "description": "Mô tả ngắn" }
        ],
        "recommendation": "Khuyến nghị tổng thể",
        "homeCare": ["Bước chăm sóc tại nhà 1", "Bước 2"],
        "warningSigns": ["Dấu hiệu cần đến bác sĩ ngay 1", "Dấu hiệu 2"],
        "disclaimer": "Lưu ý quan trọng"
        }`;

        console.log(prompt);
        const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text   = result.response.text();

        // Parse JSON từ response Gemini
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({ message: 'AI không thể phân tích, vui lòng thử lại.' });
        }

        const aiResult = JSON.parse(jsonMatch[0]);
        res.status(200).json({ result: aiResult, rawText: text });

    } catch (error) {
        console.error('Gemini AI error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ── POST /api/ai/chat ────────────────────────────────────────────
// Chat tự do về sức khỏe thú cưng
module.exports.chat = async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build chat history
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: 'Bạn là trợ lý AI về sức khỏe thú cưng của phòng khám PooGi. Hãy trả lời bằng tiếng Việt, thân thiện và chính xác.' }],
                },
                {
                    role: 'model',
                    parts: [{ text: 'Xin chào! Tôi là trợ lý AI của PooGi 🐾 Tôi có thể giúp bạn tư vấn về sức khỏe thú cưng. Hãy mô tả triệu chứng hoặc câu hỏi của bạn nhé!' }],
                },
                ...history.map(h => ({
                    role: h.role,
                    parts: [{ text: h.content }],
                })),
            ],
        });

        const result   = await chat.sendMessage(message);
        const response = result.response.text();

        res.status(200).json({ response, role: 'model' });

    } catch (error) {
        console.error('Gemini chat error:', error.message);
        res.status(500).json({ error: error.message });
    }
};