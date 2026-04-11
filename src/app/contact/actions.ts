'use server';

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ContactFormEmail } from '@/emails/ContactForm';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const ADMIN_EMAIL = 'jackseliquid@gmail.com';
const FROM_EMAIL  = 'sales@jackseliquid.co.uk';

export type ContactFormState = {
  success?: boolean;
  error?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name    = (formData.get('name')    as string || '').trim();
  const email   = (formData.get('email')   as string || '').trim();
  const phone   = (formData.get('phone')   as string || '').trim();
  const subject = (formData.get('subject') as string || '').trim();
  const message = (formData.get('message') as string || '').trim();

  // Basic validation
  if (!name || !email || !subject || !message) {
    return { error: 'Please fill in all required fields.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (message.length < 10) {
    return { error: 'Message must be at least 10 characters.' };
  }

  const submittedAt = new Date().toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London'
  });

  try {
    const html = await render(
      ContactFormEmail({ name, email, phone: phone || undefined, subject, message, submittedAt })
    );

    const { error } = await resend.emails.send({
      from:     `Jack's E-Liquid <${FROM_EMAIL}>`,
      to:       [ADMIN_EMAIL],
      replyTo:  email,           // ← When Nick hits Reply, it goes to the customer
      subject:  `📬 Contact: ${subject}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { error: 'Failed to send message. Please try emailing us directly at sales@jackseliquid.co.uk' };
    }

    return { success: true };
  } catch (err) {
    console.error('Contact form error:', err);
    return { error: 'Something went wrong. Please try again.' };
  }
}
