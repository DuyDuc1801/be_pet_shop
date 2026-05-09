// utils/retry.js
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function retryWithBackoff(fn, options = {}) {
    const { retries = 5, initialDelay = 1000, maxDelay = 10000 } = options;

    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            const is503 =
                error.message?.includes('503') ||
                error.message?.includes('Service Unavailable');

            if (!is503) throw error;

            const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
            console.warn(`Retry ${i + 1} sau ${delay}ms`);
            await sleep(delay);
        }
    }

    throw new Error('AI quá tải');
}

module.exports = { retryWithBackoff, sleep };