import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email: 'siya@portal.com',
      password: '123456'
    });
    
    const user = signInData.user;
    
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const currentCounters = typeof prof.assigned_counters === 'string' ? JSON.parse(prof.assigned_counters) : (prof.assigned_counters || []);
    const currentWarehouses = typeof prof.assigned_warehouses === 'string' ? JSON.parse(prof.assigned_warehouses) : (prof.assigned_warehouses || []);
    
    console.log('Current counters:', currentCounters);
    console.log('Current warehouses:', currentWarehouses);
    
    const newCounters = Array.from(new Set([...currentCounters, ...currentWarehouses]));
    
    console.log('Trying to update to:', newCounters);
    const { data: updateData, error: updateErr } = await supabase.from('profiles').update({ assigned_counters: newCounters }).eq('id', user.id);
    
    if (updateErr) {
        console.error('Update failed:', updateErr.message);
    } else {
        console.log('Update succeeded!');
        
        // Let's test fetching accessories again!
        const { data: accs } = await supabase.from('accessories').select('id, counter_id, name').limit(100);
        console.log(`Team lead can now see ${accs.length} accessories!`);
    }
  } catch (error) {
    console.error(error);
  }
}

debug();
