import { NextRequest, NextResponse } from 'next/server';
import { AI_PROMPTS, AiGenerateType } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { type, context } = await request.json() as {
      type: AiGenerateType;
      context: Record<string, string>;
    };

    const promptConfig = AI_PROMPTS[type];
    if (!promptConfig) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    const userPrompt = promptConfig.userTemplate(context);

    // Enable Google Search grounding for product descriptions
    // This lets Gemini look up real product specs before writing
    const useSearch = type === 'product_short' || type === 'product_long' || type === 'blog';

    const requestBody: Record<string, unknown> = {
      system_instruction: {
        parts: [{ text: promptConfig.system }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: type === 'product_short' || type === 'seo_meta' ? 1024 : type === 'blog' ? 8192 : 4096,
      },
    };

    // Add Google Search grounding tool for product descriptions
    if (useSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AI Generate] Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Gemini API error — check console' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // With grounding, content may be across multiple parts
    // Filter out 'thought' parts from Gemini 2.5 (thinking model)
    const parts = data.candidates?.[0]?.content?.parts || [];
    const content = parts
      .filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join('')
      .trim();

    if (!content) {
      return NextResponse.json(
        { error: 'Gemini returned empty response' },
        { status: 502 }
      );
    }

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('[AI Generate] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
