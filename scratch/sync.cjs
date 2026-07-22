const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) { console.error('Error fetching profiles', error); return; }
  
  console.log(`Found ${profiles.length} profiles to sync.`);
  
  const domains = [
    'portal.com', 'teamlead.com', 'cashier.com', 'auditor.com',
    'portal.local', 'teamlead.local', 'cashier.local', 'auditor.local'
  ];

  for (const profile of profiles) {
    if (profile.role === 'admin') continue;
    
    let loggedIn = false;
    let authClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false }});
    
    const usernameVariants = new Set([
      profile.username.trim().toLowerCase(),
      profile.name.trim().toLowerCase(),
      'car',
      'crr',
      profile.username.trim().toLowerCase().replace(/\s+/g, '')
    ]);
    
    for (const un of usernameVariants) {
      if (!un) continue;
      for (const domain of domains) {
        const emailToTry = `${un}@${domain}`;
        const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
          email: emailToTry,
          password: profile.password
        });
        
        if (!loginError && loginData.user) {
          console.log(`✅ Successfully logged into ${profile.username} (ID: ${profile.id}) using ${emailToTry}`);
          loggedIn = true;
          
          const expectedEmail = `${profile.username.trim().toLowerCase()}@portal.com`;
          if (loginData.user.email !== expectedEmail) {
             const { error: updateError } = await authClient.auth.updateUser({ email: expectedEmail });
             if (updateError) {
               console.log(`   ❌ Failed to sync email to ${expectedEmail}: `, updateError.message);
             } else {
               console.log(`   🔄 Synced email to ${expectedEmail}`);
             }
          } else {
             console.log(`   ✔️ Email already perfectly synced (${expectedEmail})`);
          }
          break;
        }
      }
      if (loggedIn) break;
    }
    
    if (!loggedIn) {
      console.log(`❌ FAILED to log into ${profile.username} (ID: ${profile.id}) with any known combination. Password in DB: ${profile.password}`);
    }
    await authClient.auth.signOut();
  }
}
run();
