import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
supabase.from('bills').update({ approval_status: 'closed' }).eq('id', 'nonexistent-id').select().then(({error}) => console.log(error ? 'Error: ' + JSON.stringify(error) : 'Success'));
