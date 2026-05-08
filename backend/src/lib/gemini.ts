import { GoogleGenerativeAI } from '@google/generative-ai'

// Key is optional at startup; calls will fail at runtime if key is absent
export const GEMINI_MODELS = {
  DRAFT: process.env.GEMINI_MODEL_DRAFT ?? 'gemini-2.0-flash',
  CLASSIFY: process.env.GEMINI_MODEL_CLASSIFY ?? 'gemini-2.0-flash',
  TONE: process.env.GEMINI_MODEL_TONE ?? 'gemini-2.0-flash',
} as const

export function createGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
}
