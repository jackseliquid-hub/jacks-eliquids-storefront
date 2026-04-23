import { NextRequest, NextResponse } from 'next/server';
import { AI_PROMPTS, AiGenerateType } from '@/lib/ai-prompts';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { type, context } = await request.json() as {
      type: AiGenerateType;
      context: Record<string, string>;
    };

    const defaultPrompt = AI_PROMPTS[type];
    if (!defaultPrompt) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    // ── Check for a DB override ──────────────────────────────────────────────
    let systemText  = defaultPrompt.system;
    let userPrompt  = defaultPrompt.userTemplate(context);

    try {
      const supabase = getAdminClient();
      const { data: override } = await supabase
        .from('ai_prompt_overrides')
        .select('system, user_template')
        .eq('key', type)
        .maybeSingle();

      if (override) {
        systemText = override.system;
        // Re-apply context variables to the saved template string
        // Variables are written as ${ctx.name} etc. — evaluate them safely
        userPrompt = applyContext(override.user_template, context);
      }
    } catch {
      // If DB lookup fails, fall back gracefully to defaults
    }

    // Enable Google Search grounding for product descriptions
    const useSearch = type === 'product_short' || type === 'product_long' || type === 'blog';

    const requestBody: Record<string, unknown> = {
      system_instruction: { parts: [{ text: systemText }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: type === 'product_short' || type === 'seo_meta' ? 1024 : type === 'blog' ? 8192 : 4096,
      },
    };

    if (useSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const model = type === 'seo_meta' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AI Generate] Gemini API error:', errorData);
      let errorMsg = 'Gemini API error';
      try {
        const errJson = JSON.parse(errorData);
        errorMsg = errJson?.error?.message || errorMsg;
      } catch {}
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const data = await response.json();

    const parts = data.candidates?.[0]?.content?.parts || [];
    const content = parts
      .filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join('')
      .trim();

    if (!content) {
      return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('[AI Generate] Error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

/**
 * Substitute ${ctx.xxx} placeholders in a saved template string.
 * Safe alternative to eval() — only replaces known pattern.
 */
function applyContext(template: string, ctx: Record<string, string>): string {
  return template.replace(/\$\{ctx\.(\w+)\}/g, (_, key) => ctx[key] ?? '');
}
