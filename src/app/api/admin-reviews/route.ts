import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — list all reviews (admin)
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customer_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reviews: data || [] });
}

// PATCH — update review status
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, status } = body;

  if (!id || !['pending', 'published'].includes(status)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_reviews')
    .update({ status })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// DELETE — remove a review
export async function DELETE(request: Request) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_reviews')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
