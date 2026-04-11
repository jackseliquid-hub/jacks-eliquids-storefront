'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return redirect('/forgot-password?message=Please enter your email address.');
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jacks-eliquids-storefront.vercel.app';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    console.error('Password reset error:', error);
    return redirect(`/forgot-password?message=${encodeURIComponent(error.message)}`);
  }

  // Always show success even if email doesn't exist — prevents email enumeration attacks
  return redirect('/forgot-password?success=' + encodeURIComponent('Check your email! If an account exists for that address, a reset link is on its way.'));
}
