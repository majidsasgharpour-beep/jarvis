import { handleGemini } from './api-core.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/gemini' || url.pathname.startsWith('/api/gemini/')) {
      return handleGemini(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
