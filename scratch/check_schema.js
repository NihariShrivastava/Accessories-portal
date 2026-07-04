import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env').toString();
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: accData, error: accErr } = await supabase.from('accessories').select('*').limit(1);
  console.log('Accessories cols:', accData ? Object.keys(accData[0] || {}) : accErr);
  
  const { data: billData, error: billErr } = await supabase.from('bills').select('*').limit(1);
  console.log('Bills cols:', billData ? Object.keys(billData[0] || {}) : billErr);
  
  const { data: billItemData, error: biErr } = await supabase.from('bill_items').select('*').limit(1);
  console.log('Bill Items cols:', billItemData ? Object.keys(billItemData[0] || {}) : biErr);
}
checkSchema();
