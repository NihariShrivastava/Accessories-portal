import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'w-gwl@portal.com',
      password: '123456'
    });
    
    if (signInError) {
      console.log('Login failed for warehouse');
      return;
    }
    
    console.log('Logged in as Warehouse!');
    
    const { data: accs, error: accsErr } = await supabase.from('accessories').select('id, counter_id, name').limit(100);
    console.log(`Warehouse can see ${accs?.length || 0} accessories!`);
    
  } catch (error) {
    console.error(error);
  }
}

debug();
