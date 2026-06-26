import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePassword() {
  console.log('Logging in as admin...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@portal.local',
    password: 'admin1234'
  });
  
  if (error) {
    console.error('Failed to log in:', error.message);
    
    // Try other common passwords just in case
    console.log('Trying fallback password admin@upi...');
    const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
      email: 'admin@portal.local',
      password: 'admin@upi'
    });
    
    if (e2) {
      console.error('Fallback login failed:', e2.message);
      return;
    }
    console.log('Logged in successfully with fallback.');
  } else {
    console.log('Logged in successfully with admin1234.');
  }

  console.log('Updating password to admin@2468...');
  const { error: updateError } = await supabase.auth.updateUser({
    password: 'admin@2468'
  });

  if (updateError) {
    console.error('Failed to update password:', updateError.message);
  } else {
    console.log('Password updated successfully!');
  }
}

updatePassword();
