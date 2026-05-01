import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // Logged once at module load. Routes that hit Gemini check `geminiModel`
  // and respond with a 503 if it is null, so the app keeps booting.
  // eslint-disable-next-line no-console
  console.warn('GEMINI_API_KEY not set — AI scoring will be disabled');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiModel: GenerativeModel | null = genAI
  ? genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    })
  : null;

export const GEMINI_MODEL_VERSION = 'gemini-1.5-flash';

export async function analyzeDocuments(prompt: string): Promise<string> {
  if (!geminiModel) {
    throw new Error('AI_DISABLED');
  }
  try {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status === 429) {
      throw new Error('AI_RATE_LIMITED');
    }
    throw new Error(`AI_SERVICE_ERROR: ${err?.message ?? 'unknown error'}`);
  }
}
