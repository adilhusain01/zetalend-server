"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const generative_ai_1 = require("@google/generative-ai");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Initialize Gemini AI
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);
// Basic AI risk assessment endpoint
app.post('/api/risk-assessment', async (req, res) => {
    try {
        const { btcAmount } = req.body;
        if (!btcAmount || btcAmount <= 0) {
            return res.status(400).json({ error: 'Invalid BTC amount' });
        }
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `
        Bitcoin lending risk assessment for ${btcAmount / 1e8} BTC collateral:
        
        Current market context:
        - Bitcoin is a volatile cryptocurrency
        - Standard lending practices use 60-70% LTV for crypto collateral
        - Higher volatility = lower safe LTV
        
        Analyze and respond with valid JSON only:
        {
          "isRisky": boolean (true if high volatility expected),
          "maxLTV": number (40-70, recommended max loan-to-value %),
          "reason": "brief explanation in 1 sentence",
          "volatilityScore": number (1-100, higher = more volatile),
          "confidenceLevel": number (1-100, confidence in prediction)
        }
        `;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Parse JSON response (handle markdown code blocks)
        let prediction;
        try {
            // Remove markdown code blocks if present
            let cleanedResponse = responseText.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            prediction = JSON.parse(cleanedResponse);
        }
        catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            // Fallback response
            prediction = {
                isRisky: true,
                maxLTV: 60,
                reason: "Conservative estimate due to crypto volatility",
                volatilityScore: 70,
                confidenceLevel: 80
            };
        }
        res.json(prediction);
    }
    catch (error) {
        console.error('AI service error:', error);
        res.status(500).json({
            error: 'AI service temporarily unavailable',
            fallback: {
                isRisky: true,
                maxLTV: 60,
                reason: "Conservative fallback due to service error",
                volatilityScore: 70,
                confidenceLevel: 50
            }
        });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        geminiConfigured: !!process.env.GEMINI_API_KEY
    });
});
app.listen(PORT, () => {
    console.log(`🚀 AI service running on port ${PORT}`);
    console.log(`✅ Gemini API configured: ${!!process.env.GEMINI_API_KEY}`);
});
//# sourceMappingURL=app.js.map