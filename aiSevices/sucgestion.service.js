// services/suggestion.service.js
function generateSuggestions(text) {
    const s = text.toLowerCase();
    const suggestions = [];

    if (s.includes('tiêu chảy')) {
        suggestions.push('Xem sản phẩm hỗ trợ tiêu hóa');
    }

    if (s.includes('nôn')) {
        suggestions.push('Theo dõi tình trạng nôn');
    }

    if (s.includes('khám')) {
        suggestions.push('Đặt lịch khám tại PooGi');
    }

    return suggestions;
}

module.exports = { generateSuggestions };