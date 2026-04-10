import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const testId = "00000000-0000-0000-0000-000000000000";
  const { error } = await supabase.from('customers').upsert({
    id: testId,
    email: "debug@debug.com",
    billing_address: { test: 1 }
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  await supabase.from('customers').delete().eq('id', testId);
  return NextResponse.json({ success: true });
}
