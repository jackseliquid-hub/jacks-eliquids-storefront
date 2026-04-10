import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const { data, error } = await supabase.from('products').select('id, images').limit(3);
console.log("Products images:", data);
