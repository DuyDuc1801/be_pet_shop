// services/ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff, sleep } = require('../utils/retry');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callAI(prompt) {
    await sleep(300);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        return await retryWithBackoff(() => model.generateContent(prompt));
    } catch (err) {
        const fallback = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
        return await retryWithBackoff(() => fallback.generateContent(prompt));
    }
}

function safeParseJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

module.exports = {
    callAI,
    safeParseJSON
};