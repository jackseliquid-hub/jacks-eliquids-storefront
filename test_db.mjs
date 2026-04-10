import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
async function run() {
  const { data } = await supabase.from('orders').select('shipping_address, billing_address').order('created_at', { ascending: false }).limit(1);
  console.log("LAST ORDER:");
  console.log(JSON.stringify(data[0], null, 2));

  const { data: cust } = await supabase.from('customers').select('shipping_address, billing_address').order('created_at', { ascending: false }).limit(1);
  console.log("LAST CUTOMER:");
  console.log(JSON.stringify(cust[0], null, 2));
}
run();
