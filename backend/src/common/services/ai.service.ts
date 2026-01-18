import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIService {
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  async getErrorExplanation(
    questionTitle: string,
    questionDescription: string,
    correctAnswer: string,
    userAnswer: string,
    language: string,
  ): Promise<string | null> {
    if (!this.apiKey) {
      console.error('AI hiba: GEMINI_API_KEY nem érhető el.');
      return null;
    }

    const prompt = `
      You are a helpful programming mentor. A student made a mistake in a ${language} task.
      Task: ${questionTitle} - ${questionDescription}
      Correct answer: ${correctAnswer}
      Student's answer: ${userAnswer}

      Explain in max 2 simple, clear sentences in Hungarian why their answer is wrong.
      DO NOT give the correct answer directly. Instead, guide them to find it.
      DO NOT use greetings like "Szia" or "Üdvözöllek". Start directly with the explanation.
      Don't use complex jargon. Be encouraging.
    `;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000, // Slightly increased timeout for Gemini
        },
      );

      const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (!result) {
        console.error('AI hiba: Üres választ küldött az AI.');
        return null;
      }
      return result;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('AI hiba: Időtúllépés (Timeout).');
      } else {
        console.error('AI hiba: ', error.response?.data?.error?.message || error.message);
      }
      return null;
    }
  }
}
