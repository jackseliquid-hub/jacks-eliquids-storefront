import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function check() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    // try to execute an upsert with the service role to ensure the columns exist!
    const testId = "00000000-0000-0000-0000-000000000000";
    const res = await supabase.from('customers').upsert({
      id: testId,
      email: "test@test.com",
      billing_address: { test: 1 }
    });
    console.log("Upsert result:", res.error?.message || "Success");
    await supabase.from('customers').delete().eq('id', testId);
  }
}
check();
