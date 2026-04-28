import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jacks-eliquids-storefront.vercel.app';

export async function POST(request: Request) {
  try {
    const { customer_email, customer_name, reply_text, rating } = await request.json();

    if (!customer_email || !reply_text?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const firstName = customer_name?.split(' ')[0] || 'Customer';
    const stars = '⭐'.repeat(rating || 5);

    await resend.emails.send({
      from: 'Jack\'s E-Liquid <sales@jackseliquid.co.uk>',
      to: [customer_email],
      subject: `Thanks for your review! — Jack's E-Liquid`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 28px 28px; color: #fff; text-align: center;">
            <img src="https://jlauicuvxldslzciebyu.supabase.co/storage/v1/object/public/media/brand/logo.png" width="150" alt="Jacks eLiquid" style="margin: 0 auto 12px;" />
            <h2 style="margin: 0; font-size: 20px;">Thanks for Your Review!</h2>
          </div>
          <div style="padding: 28px;">
            <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 16px;">
              Hi ${firstName},
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px;">
              ${reply_text.replace(/\n/g, '<br/>')}
            </p>

            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Your review (${stars}):</div>
              <div style="font-size: 14px; color: #374151; font-style: italic;">"${customer_name}'s review"</div>
            </div>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0 0 20px;">
              Your feedback means the world to us — it helps other vapers find quality products and keeps us motivated to do even better.
            </p>

            <div style="text-align: center;">
              <a href="${SITE_URL}" style="display: inline-block; background: #0d9488; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Continue Shopping →
              </a>
            </div>
          </div>
          <div style="background: #e0f2f1; padding: 20px 28px; text-align: center;">
            <p style="font-size: 13px; color: #4b5563; margin: 0;">
              Jack's E-Liquid — Thank you for being part of our community 💚
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reply email error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 });
  }
}
