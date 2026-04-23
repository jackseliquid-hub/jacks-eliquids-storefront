import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PROMPT_KEYS = ['product_short', 'product_long', 'blog', 'page', 'seo_meta'];

const LABELS: Record<string, string> = {
  product_short: 'Product Short Description',
  product_long:  'Product Long Description',
  blog:          'Blog Article',
  page:          'Website Page',
  seo_meta:      'SEO Meta Tags',
};

/**
 * Extract the raw template literal strings from ai-prompts.ts
 * Returns { key: { system, userTemplate } }
 */
function extractDefaults(): Record<string, { system: string; userTemplate: string }> {
  const src = readFileSync(join(process.cwd(), 'src', 'lib', 'ai-prompts.ts'), 'utf-8');
  const result: Record<string, { system: string; userTemplate: string }> = {};

  for (const key of PROMPT_KEYS) {
    // Extract system: `...`
    const sysRe = new RegExp(`${key}:\\s*\\{[\\s\\S]*?system:\\s*\`([\\s\\S]*?)\`\\s*,`);
    const sysMatch = sysRe.exec(src);

    // Extract userTemplate: (ctx) => `...`
    const tmplRe = new RegExp(`${key}:\\s*\\{[\\s\\S]*?userTemplate:\\s*\\([^)]*\\)\\s*=>\\s*\`([\\s\\S]*?)\``);
    const tmplMatch = tmplRe.exec(src);

    result[key] = {
      system:       sysMatch?.[1]  ?? '',
      userTemplate: tmplMatch?.[1] ?? '',
    };
  }
  return result;
}

// ── GET: Return all prompts (defaults + any DB overrides) ──────────────────
export async function GET() {
  const defaults = extractDefaults();
  const supabase = getAdminClient();

  const { data: overrides } = await supabase
    .from('ai_prompt_overrides')
    .select('*');

  const overrideMap = new Map((overrides || []).map((r: any) => [r.key, r]));

  const prompts = PROMPT_KEYS.map(key => {
    const override = overrideMap.get(key) as any;
    return {
      key,
      label:        LABELS[key] || key,
      system:       override?.system        ?? defaults[key]?.system        ?? '',
      userTemplate: override?.user_template ?? defaults[key]?.userTemplate  ?? '',
      isOverridden: !!override,
      // Always send defaults so UI can offer "Reset to default"
      defaultSystem:       defaults[key]?.system       ?? '',
      defaultUserTemplate: defaults[key]?.userTemplate ?? '',
    };
  });

  return NextResponse.json({ prompts });
}

// ── POST: Save an override to Supabase ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { key, system, userTemplate } = await req.json() as {
      key: string;
      system: string;
      userTemplate: string;
    };

    if (!key || typeof system !== 'string' || typeof userTemplate !== 'string') {
      return NextResponse.json({ error: 'Missing key, system, or userTemplate' }, { status: 400 });
    }

    if (!PROMPT_KEYS.includes(key)) {
      return NextResponse.json({ error: `Unknown prompt key: ${key}` }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('ai_prompt_overrides')
      .upsert({
        key,
        label: LABELS[key] || key,
        system,
        user_template: userTemplate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: Reset a prompt back to its coded default ─────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json() as { key: string };
    const supabase = getAdminClient();
    await supabase.from('ai_prompt_overrides').delete().eq('key', key);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
