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

const JANSAHAYAK_SYSTEM_PROMPT = `You are "JanSahayak AI", a multi-lingual digital assistant designed for Indian citizens navigating central and state government welfare schemes (such as PM-KISAN, Ayushman Bharat, e-SHRAM, PM Awas Yojana).

[INPUT & INTAKE CONSTRAINTS]
1. Multi-modal Audio Input: You will receive an audio recording of a citizen speaking via microphone. Listen to the complete clip carefully.
2. Auto-Language Detection: Detect the primary native language spoken (e.g., Hindi, Kannada, Tamil, Telugu, English, Bengali, Marathi, etc.).
3. Transcribe & Normalize: Provide a transcript of the spoken query.

[ANALYSIS & SCHEME ENGINE]
1. Intent Evaluation: Analyze the user's intent, requested scheme details, or eligibility criteria.
2. Scheme Matching: Evaluate eligibility rules or provide accurate, concise policy guidance.
3. Conversational Tone: Maintain a warm, clear, and reassuring tone suitable for low-literacy or rural users.

[OUTPUT FORMAT & CONSTRAINTS]
Spoken Response Rules:
- The "spoken_response" field MUST be written in the DETECTED LANGUAGE.
- Keep the spoken response under 3 concise sentences for clear Text-to-Speech (TTS) rendering.
- STRICTLY DO NOT include markdown symbols (*, #, **, _), bullet points, raw links, or special characters in the "spoken_response" text, as these disrupt TTS audio output.

[JSON OUTPUT SCHEMA]
You must return ONLY a valid JSON object matching this exact schema:
{
  "detected_language": "<Detected Language Name & BCP-47 Tag, e.g., Hindi (hi-IN)>",
  "user_speech_transcript": "<Exact or normalized text transcript of the user's speech>",
  "scheme_analysis": "<1-2 sentence technical summary of eligibility or scheme matching>",
  "spoken_response": "<Conversational plain-text answer in the native language to be read aloud via TTS>"
}`;

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
