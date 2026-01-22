
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Transcribe short audio blob and detect if user said "jump", "hop", "go", etc.
   */
  async checkVoiceCommand(audioBase64: string): Promise<boolean> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: "Listen to this audio. If you hear the speaker say a word related to jumping (like jump, hop, go, up, fly, tweet, or any loud sudden shout), respond ONLY with the word 'JUMP'. Otherwise respond with 'NONE'.",
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
        }
      });

      const text = response.text?.trim().toUpperCase();
      return text === 'JUMP';
    } catch (error) {
      console.error("Gemini Transcription Error:", error);
      return false;
    }
  }
}

export const geminiService = new GeminiService();
