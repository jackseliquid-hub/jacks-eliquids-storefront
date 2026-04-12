/**
 * Feed Import API Route
 *
 * GET /api/feed-import
 * - Called daily by Vercel Cron at 4am UTC
 * - Can also be triggered manually from the Kitchen dashboard
 * - Secured with CRON_SECRET header
 * - Sends an email report via Resend after completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runFeedImport } from '@/lib/feed-import';

// Extend the max execution time to 60 seconds (Vercel Hobby limit)
export const maxDuration = 60;
// Use Node.js runtime (needed for sharp)
export const runtime = 'nodejs';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────
  // Accept either the CRON_SECRET header (for Vercel Cron) or a valid admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // If not cron, check for admin session cookie
    const isManualTrigger = request.nextUrl.searchParams.get('manual') === 'true';
    if (!isManualTrigger) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const feedUrl = process.env.EQ_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json({ error: 'EQ_FEED_URL not configured' }, { status: 500 });
  }

  const supabase = getAdminClient();

  // ── Create import log entry ────────────────────────────────────────────
  const { data: logEntry } = await supabase
    .from('import_logs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  const logId = logEntry?.id;

  try {
    console.log('[Feed Import] Starting import...');
    const result = await runFeedImport(feedUrl);

    // ── Update import log ────────────────────────────────────────────────
    const summary = [
      `✅ Added: ${result.productsAdded}`,
      `🔄 Updated: ${result.productsUpdated}`,
      `⏭️ Skipped: ${result.productsSkipped}`,
      `🔧 Variations Updated: ${result.variationsUpdated}`,
      result.errors.length > 0 ? `❌ Errors: ${result.errors.length}` : '',
    ].filter(Boolean).join(' | ');

    if (logId) {
      await supabase.from('import_logs').update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        products_added: result.productsAdded,
        products_updated: result.productsUpdated,
        products_skipped: result.productsSkipped,
        variations_updated: result.variationsUpdated,
        errors: result.errors,
        summary,
      }).eq('id', logId);
    }

    // ── Send email report ────────────────────────────────────────────────
    try {
      await sendImportReportEmail(result);
    } catch (emailErr: any) {
      console.error('[Feed Import] Email report failed:', emailErr.message);
    }

    console.log(`[Feed Import] Complete: ${summary}`);
    return NextResponse.json({
      success: true,
      ...result,
      summary,
    });

  } catch (err: any) {
    console.error('[Feed Import] Fatal error:', err.message);

    if (logId) {
      await supabase.from('import_logs').update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        errors: [{ sku: 'FATAL', error: err.message }],
        summary: `❌ Fatal error: ${err.message}`,
      }).eq('id', logId);
    }

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── Email Report ───────────────────────────────────────────────────────────

async function sendImportReportEmail(result: {
  productsAdded: number;
  productsUpdated: number;
  productsSkipped: number;
  variationsUpdated: number;
  addedSkus: string[];
  updatedSkus: string[];
  errors: { sku: string; error: string }[];
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Feed Import] RESEND_API_KEY missing, skipping email');
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

  // Build a clean HTML email
  const addedList = result.addedSkus.length > 0
    ? result.addedSkus.map(s => `<li>${s}</li>`).join('')
    : '<li>None</li>';

  const updatedList = result.updatedSkus.length > 0
    ? result.updatedSkus.slice(0, 50).map(s => `<li>${s}</li>`).join('')
    + (result.updatedSkus.length > 50 ? `<li>...and ${result.updatedSkus.length - 50} more</li>` : '')
    : '<li>None</li>';

  const errorList = result.errors.length > 0
    ? result.errors.map(e => `<li>${e.sku}: ${e.error}</li>`).join('')
    : '';

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0f766e; margin-bottom: 4px;">📦 EQ Wholesale Import Report</h2>
      <p style="color: #6b7280; margin-top: 0;">${now}</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f0fdfa;">
          <td style="padding: 10px 14px; font-weight: 600;">🆕 Products Added (Draft)</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f766e;">${result.productsAdded}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600;">🔄 Products Updated</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700;">${result.productsUpdated}</td>
        </tr>
        <tr style="background: #f0fdfa;">
          <td style="padding: 10px 14px; font-weight: 600;">⏭️ Skipped (No Changes)</td>
          <td style="padding: 10px 14px; text-align: right;">${result.productsSkipped}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600;">🔧 Variations Updated</td>
          <td style="padding: 10px 14px; text-align: right;">${result.variationsUpdated}</td>
        </tr>
        ${result.errors.length > 0 ? `
        <tr style="background: #fef2f2;">
          <td style="padding: 10px 14px; font-weight: 600; color: #dc2626;">❌ Errors</td>
          <td style="padding: 10px 14px; text-align: right; color: #dc2626; font-weight: 700;">${result.errors.length}</td>
        </tr>` : ''}
      </table>

      ${result.productsAdded > 0 ? `
      <h3 style="color: #0f766e;">🆕 New Products Added as Draft</h3>
      <ul style="font-size: 13px; color: #374151;">${addedList}</ul>
      <p style="font-size: 12px; color: #9ca3af;">These products are saved as draft. Open the Kitchen → Products → filter by "Draft" to review and set prices.</p>
      ` : ''}

      ${result.productsUpdated > 0 ? `
      <h3>🔄 Updated Products (cost/qty changes)</h3>
      <ul style="font-size: 13px; color: #374151;">${updatedList}</ul>
      ` : ''}

      ${result.errors.length > 0 ? `
      <h3 style="color: #dc2626;">❌ Errors</h3>
      <ul style="font-size: 13px; color: #dc2626;">${errorList}</ul>
      ` : ''}

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">This report was generated automatically by Jacks eLiquid Feed Import.</p>
    </div>
  `;

  await resend.emails.send({
    from: 'Jacks Server <sales@jackseliquid.co.uk>',
    to: ['jackseliquid@gmail.com'],
    subject: `📦 Feed Import: ${result.productsAdded} added, ${result.productsUpdated} updated`,
    html,
  });
}
