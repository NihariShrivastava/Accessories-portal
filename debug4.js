import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@portal.com',
      password: 'password' // or admin123
    });
    
    if (signInError) {
      console.log('Login failed as admin@portal.com with password. Trying admin123...');
      const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
        email: 'admin@portal.com',
        password: 'admin'
      });
      if (signInError2) {
          const { data: signInData3, error: signInError3 } = await supabase.auth.signInWithPassword({
            email: 'admin@portal.com',
            password: 'admin123'
          });
          if (signInError3) {
             const { data: signInData4, error: signInError4 } = await supabase.auth.signInWithPassword({
                email: 'admin@portal.com',
                password: '123456'
              });
              if (signInError4) {
                 console.log("Could not login as admin");
                 return;
              }
          }
      }
    }
    
    console.log('Logged in as Admin!');
    
    const { data: wGwl } = await supabase.from('profiles').select('id').eq('name', 'w-gwl').single();
    if (!wGwl) return console.log('w-gwl not found');
    
    const { data: accs, error: accsErr } = await supabase.from('accessories').select('id, name').eq('counter_id', wGwl.id);
    console.log(`w-gwl has ${accs?.length || 0} accessories!`);
    
  } catch (error) {
    console.error(error);
  }
}

debug();
