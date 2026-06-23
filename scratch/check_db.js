import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read from .env
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');
let url = '', key = '';
lines.forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('bills').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data keys:', data ? Object.keys(data[0] || {}) : 'no data');
}
check();
