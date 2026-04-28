import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const ADMIN_EMAIL = 'jackseliquid@gmail.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jacks-eliquids-storefront.vercel.app';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_name, customer_email, rating, review_text } = body;

    // Validate
    if (!customer_name?.trim() || !customer_email?.trim() || !rating || !review_text?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    // Insert into Supabase (service role to bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: dbError } = await supabase
      .from('customer_reviews')
      .insert({
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim(),
        rating,
        review_text: review_text.trim(),
        status: 'pending',
      });

    if (dbError) {
      console.error('Review insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
    }

    // Send admin notification email
    const stars = '⭐'.repeat(rating);
    try {
      await resend.emails.send({
        from: 'Jacks Server <sales@jackseliquid.co.uk>',
        to: [ADMIN_EMAIL],
        subject: `[New Review] ${stars} from ${customer_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px 28px; color: #fff;">
              <h2 style="margin: 0 0 4px; font-size: 20px;">New Customer Review</h2>
              <p style="margin: 0; opacity: 0.85; font-size: 14px;">Someone left a review on the site</p>
            </div>
            <div style="padding: 24px 28px;">
              <div style="margin-bottom: 16px;">
                <div style="font-weight: 700; color: #111; font-size: 16px;">${customer_name}</div>
                <div style="color: #6b7280; font-size: 13px;">${customer_email}</div>
              </div>
              <div style="margin-bottom: 16px; font-size: 24px;">${stars}</div>
              <div style="background: #f9fafb; padding: 14px 16px; border-radius: 8px; border: 1px solid #f3f4f6; font-size: 14px; color: #374151; line-height: 1.6;">
                "${review_text}"
              </div>
              <div style="margin-top: 20px;">
                <a href="${SITE_URL}/admin/reviews" style="display: inline-block; background: #0d9488; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">
                  Review in Kitchen →
                </a>
              </div>
              <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
                This review is currently <strong>pending</strong>. Visit the Kitchen to publish or delete it.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      // Don't fail the review submission if email fails
      console.error('Admin review notification email failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Submit review error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
