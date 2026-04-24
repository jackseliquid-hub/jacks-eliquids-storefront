import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/send-stock-notifications
 *
 * Accepts { variationIds?: string[], productIds?: string[] }
 * Finds all unnotified sign-ups for those IDs and sends Resend emails.
 * Called automatically from updateProduct() when in_stock flips true,
 * and also at the end of a feed import for any restocked variations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { variationIds = [], productIds = [] } = body as {
      variationIds?: string[];
      productIds?: string[];
    };

    if (variationIds.length === 0 && productIds.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 'no ids provided' });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey);

    // ── 1. Fetch pending notifications matching these ids ──────────────────────
    // We match on variation_id OR product_id (covers both card-level and product-page sign-ups)
    let query = supabase
      .from('stock_notifications')
      .select('id, email, name, variation_id, product_id')
      .eq('notified', false);

    if (variationIds.length > 0 && productIds.length > 0) {
      // match either field
      query = query.or(
        `variation_id.in.(${variationIds.join(',')}),product_id.in.(${productIds.join(',')})`
      );
    } else if (variationIds.length > 0) {
      query = query.in('variation_id', variationIds);
    } else {
      query = query.in('product_id', productIds);
    }

    const { data: notifications, error: notifErr } = await query;
    if (notifErr) {
      console.error('[send-stock-notifications] Query error:', notifErr);
      return NextResponse.json({ error: notifErr.message }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No pending notifications found' });
    }

    console.log(`[send-stock-notifications] Sending ${notifications.length} email(s)...`);

    // ── 2. Fetch product details ───────────────────────────────────────────────
    const allProductIds = [...new Set(notifications.map(n => n.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, image')
      .in('id', allProductIds);
    const productMap = new Map((products || []).map(p => [p.id, p]));

    // ── 3. Fetch variation details ─────────────────────────────────────────────
    const allVarIds = [...new Set(notifications.map(n => n.variation_id).filter(Boolean))];
    const varMap = new Map<string, { attributes: Record<string, string> }>();
    if (allVarIds.length > 0) {
      const { data: vars } = await supabase
        .from('product_variations')
        .select('id, attributes')
        .in('id', allVarIds);
      for (const v of (vars || [])) varMap.set(v.id, v);
    }

    // ── 4. Send emails via Resend ──────────────────────────────────────────────
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquids.co.uk';

    let sent = 0;
    const notifiedIds: string[] = [];

    for (const notif of notifications) {
      const prod = productMap.get(notif.product_id);
      if (!prod) continue;

      // Get variant label (e.g. "Strawberry Ice / 3mg")
      const vari = varMap.get(notif.variation_id);
      const variantLabel = (vari?.attributes && Object.values(vari.attributes).length > 0)
        ? Object.values(vari.attributes).join(' / ')
        : '';

      const productUrl = `${siteUrl}/product/${prod.slug}`;
      const greeting = notif.name ? `, ${notif.name}` : '';
      const fullProductName = `${prod.name}${variantLabel ? ` — ${variantLabel}` : ''}`;

      try {
        await resend.emails.send({
          from: "Jack's E-Liquid <noreply@jackseliquids.co.uk>",
          to: notif.email,
          subject: `🔔 Back in Stock: ${fullProductName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
              <!-- Header -->
              <div style="background: #008080; padding: 2rem; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: #fff; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">
                  Jack's E-Liquid
                </h1>
              </div>

              <!-- Body -->
              <div style="background: #fff; padding: 2.5rem 2rem; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #111; margin: 0 0 1rem; font-size: 1.3rem;">
                  Great news${greeting}! 🎉
                </h2>

                <p style="color: #4b5563; font-size: 1rem; line-height: 1.65; margin: 0 0 1.5rem;">
                  <strong style="color: #111;">${fullProductName}</strong> is back in stock and ready to order.
                </p>

                ${prod.image ? `
                <div style="text-align: center; margin: 1.5rem 0;">
                  <img src="${prod.image}" alt="${prod.name}" style="max-width: 180px; border-radius: 12px; border: 1px solid #e5e7eb;" />
                </div>` : ''}

                <div style="text-align: center; margin: 2rem 0;">
                  <a href="${productUrl}"
                     style="display: inline-block; background: #008080; color: #fff; padding: 0.85rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1rem;">
                    Shop Now →
                  </a>
                </div>

                <p style="color: #9ca3af; font-size: 0.8rem; margin: 2rem 0 0; text-align: center; line-height: 1.5;">
                  You received this because you signed up for a back-in-stock notification at
                  <a href="${siteUrl}" style="color: #008080;">jackseliquids.co.uk</a>.
                </p>
              </div>
            </div>
          `,
        });

        notifiedIds.push(notif.id);
        sent++;
      } catch (emailErr) {
        console.error(`[send-stock-notifications] Failed to email ${notif.email}:`, emailErr);
      }
    }

    // ── 5. Mark as notified ────────────────────────────────────────────────────
    if (notifiedIds.length > 0) {
      await supabase
        .from('stock_notifications')
        .update({ notified: true })
        .in('id', notifiedIds);
    }

    console.log(`[send-stock-notifications] Sent ${sent}/${notifications.length} emails.`);
    return NextResponse.json({ sent, total: notifications.length });

  } catch (err: any) {
    console.error('[send-stock-notifications] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
