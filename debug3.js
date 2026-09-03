import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'siya@portal.com',
      password: '123456' // Guessing password based on common test passwords
    });
    
    if (signInError) {
      console.log('Login failed:', signInError.message);
      return;
    }
    
    console.log('Logged in as:', signInData.user.email);
    
    // Now try to fetch accessories!
    const { data: accs, error: accsErr } = await supabase.from('accessories').select('id, counter_id, name').limit(100);
    if (accsErr) throw accsErr;
    
    console.log(`Team lead can see ${accs.length} accessories!`);
    if (accs.length > 0) {
      // Find unique counter_ids visible to this team lead
      const counterIds = [...new Set(accs.map(a => a.counter_id))];
      console.log('Visible counter IDs:', counterIds);
      
      // Let's check which of these are counters vs warehouses
      const { data: profiles } = await supabase.from('profiles').select('id, role, name').in('id', counterIds);
      console.log('Profiles for these IDs:', profiles);
    }
  } catch (error) {
    console.error(error);
  }
}

debug();
