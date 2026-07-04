import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env').toString();
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('accessories').insert({
    counter_id: '00000000-0000-0000-0000-000000000000',
    vehicle_model: 'test',
    name: 'test',
    quantity: 1,
    price: 100,
    purchase_price: 80
  });
  console.log(error);
}
test();
