const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
async function run() {
  const { data, error } = await supabase.from('site_settings').select('*');
  console.log("Error:", error?.message);
}
run();
