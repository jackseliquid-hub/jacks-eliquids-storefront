import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Ensure a customer profile exists for OAuth users
      const user = data.user;
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        // Create customer profile from OAuth metadata
        const meta = user.user_metadata || {};
        await supabase.from('customers').insert({
          id: user.id,
          email: user.email,
          first_name: meta.full_name?.split(' ')[0] || meta.name?.split(' ')[0] || '',
          last_name: meta.full_name?.split(' ').slice(1).join(' ') || meta.name?.split(' ').slice(1).join(' ') || '',
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate with Google`);
}
