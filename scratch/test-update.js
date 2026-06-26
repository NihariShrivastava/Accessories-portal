const test = async () => {
  const m = await import('@supabase/supabase-js');
  const supabase = m.createClient('https://zofatjejtcjdocggvtid.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E');
  
  const rStr = Math.random().toString(36).substring(7); 
  const email = `test_${rStr}@portal.local`; 
  const pass = 'oldPassword123'; 
  
  let res = await supabase.auth.signUp({email, password: pass});
  console.log('signUp:', res.error); 
  
  const newEmail = `test_${rStr}_new@portal.local`; 
  const newPass = 'newPassword456'; 
  
  res = await supabase.auth.updateUser({email: newEmail, password: newPass});
  console.log('updateUser:', res.error); 
  
  res = await supabase.auth.signInWithPassword({email: newEmail, password: newPass});
  console.log('loginNEW:', res.error); 
  
  res = await supabase.auth.signInWithPassword({email, password: newPass});
  console.log('loginOLD:', res.error); 
};
test();
