const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
async function run() {
  const { data } = await supabase.from('order_items').select('*').limit(1);
  console.log(data?.[0]);
}
run();
