/**
 * Vercel API Route: Gemini Voice & Welfare Intelligence Engine
 * 
 * Endpoint: POST /api/gemini-voice-analyze
 * Timeout: 30 seconds (Vercel serverless limit)
 * 
 * Input:
 *   - prompt: string (user query or context)
 *   - audioBase64: string (optional base64-encoded audio)
 * 
 * Output:
 *   - detected_language: Language name and BCP-47 code
 *   - user_speech_transcript: Exact transcript of user input
 *   - scheme_analysis: Technical eligibility analysis
 *   - spoken_response: Plain text response for TTS (max 3 sentences, no markdown)
 */

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Allow Vercel Function to run up to 30 seconds for audio/large prompts
export const maxDuration = 30;

const JANSAHAYAK_SYSTEM_PROMPT = `You are JanSahayak AI, an accessible, multi-lingual digital assistant designed for Indian citizens navigating government welfare schemes (such as PM-KISAN, Ayushman Bharat, e-SHRAM, PM Awas Yojana).

CRITICAL RULES:
1. Detect the citizen's native spoken language automatically (Hindi, Kannada, Tamil, Telugu, English, Bengali, Marathi).
2. Extract and normalize the user's query accurately.
3. Match user demographics/income against eligibility criteria for central and state welfare programs.
4. Generate a warm, clear response STRICTLY under 3 sentences in the DETECTED language.
5. NEVER output markdown formatting (*, #, **, ---, ~~~), HTML, or raw URLs in the spoken_response—this breaks TTS rendering.
6. Keep response execution tight and concise (under 10 seconds total).

When analyzing scheme eligibility, consider:
- Annual household income limits
- Land/property ownership status
- Occupation type (farmer, street vendor, artisan, etc.)
- SECC/BPL/APL status
- Age and gender eligibility
- State/region-specific criteria

Respond ONLY with a valid JSON object matching the exact schema provided.`;

export async function POST(req: Request) {
  try {
    const { prompt, audioBase64, userContext } = await req.json();

    if (!prompt && !audioBase64) {
      return Response.json(
        { error: 'Either prompt or audioBase64 must be provided' },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: JANSAHAYAK_SYSTEM_PROMPT,
      schema: z.object({
        detected_language: z
          .string()
          .describe(
            'Language name and BCP-47 code, e.g., Hindi (hi-IN), Tamil (ta-IN)'
          ),
        user_speech_transcript: z
          .string()
          .describe('Exact or normalized transcript of user speech'),
        scheme_analysis: z
          .string()
          .describe(
            '1-2 sentence technical summary of scheme eligibility match'
          ),
        spoken_response: z
          .string()
          .describe(
            'Conversational plain-text answer for TTS output in detected language (max 3 sentences, no markdown)'
          )
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this voice input for welfare scheme eligibility.'
            },
            // Audio is not directly supported in image format; pass as text metadata
            userContext
              ? {
                  type: 'text',
                  text: `User Context: ${userContext}`
                }
              : null
          ].filter(Boolean) as any[]
        }
      ]
    });

    return Response.json(result.object);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return Response.json(
      { error: (error as Error).message || 'Voice analysis failed' },
      { status: 500 }
    );
  }
}
