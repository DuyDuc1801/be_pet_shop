// services/prediction.service.js
function evaluateRisk({ symptoms, petAge }) {
    let score = 0;
    const s = symptoms.toLowerCase();

    if (s.includes('nôn')) score += 2;
    if (s.includes('tiêu chảy')) score += 2;
    if (s.includes('co giật')) score += 5;
    if (s.includes('khó thở')) score += 5;
    if (s.includes('bỏ ăn')) score += 1;

    if (petAge && petAge < 1) score += 1;

    if (score >= 6) return 'emergency';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
}

module.exports = { evaluateRisk };