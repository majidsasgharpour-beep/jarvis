import { handleGemini } from '../../api-core.js';

// Cloudflare Pages Function for /api/gemini (POST and OPTIONS).
export const onRequest = (context) => handleGemini(context.request, context.env);
