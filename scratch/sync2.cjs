const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  
  const domains = [
    'portal.com', 'teamlead.com', 'cashier.com', 'auditor.com',
    'portal.local', 'teamlead.local', 'cashier.local', 'auditor.local'
  ];

  for (const profile of profiles) {
    if (['car123', 'crr', 'auditor', 'chetak-Raisenroad', 'cashier-assecsory-bhopal'].includes(profile.username)) {
      let authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false }});
      
      const usernameVariants = new Set([
        profile.username.trim().toLowerCase(),
        profile.name.trim().toLowerCase(),
        'car', 'crr', 'auditor', 'chetak-raisenroad', 'cashier-assecsory-bhopal'
      ]);
      
      let lastError = null;
      let loggedIn = false;
      for (const un of usernameVariants) {
        if (!un) continue;
        for (const domain of domains) {
          const emailToTry = `${un}@${domain}`;
          const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
            email: emailToTry,
            password: profile.password
          });
          
          if (!loginError && loginData.user) {
            loggedIn = true;
            break;
          } else {
             if (loginError && !loginError.message.includes('Invalid login credentials')) {
                lastError = loginError.message; // Capture specific errors like 'Email not confirmed'
             }
          }
        }
        if (loggedIn) break;
      }
      if (!loggedIn) {
         console.log(`Failed for ${profile.username}. Last special error: ${lastError || 'None (all Invalid login credentials)'}`);
      }
    }
  }
}
run();
