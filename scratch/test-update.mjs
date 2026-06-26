import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  // Let's create a temp user, then try to update their email and password
  const randomStr = Math.random().toString(36).substring(7);
  const email = `test_${randomStr}@portal.local`;
  const password = 'oldPassword123';
  
  console.log('Creating user:', email);
  let res = await supabase.auth.signUp({ email, password });
  if (res.error) return console.error('signUp err:', res.error);
  
  const newEmail = `test_${randomStr}_new@portal.local`;
  const newPassword = 'newPassword456';
  
  console.log('Updating user email and password...');
  res = await supabase.auth.updateUser({ email: newEmail, password: newPassword });
  console.log('updateUser result:', res.error || 'Success');
  
  // Try login with new credentials
  console.log('Logging in with NEW credentials...');
  res = await supabase.auth.signInWithPassword({ email: newEmail, password: newPassword });
  console.log('Login NEW credentials:', res.error || 'Success');
  
  // Try login with NEW password but OLD email
  console.log('Logging in with OLD email and NEW password...');
  res = await supabase.auth.signInWithPassword({ email, password: newPassword });
  console.log('Login OLD email NEW pass:', res.error || 'Success');
}

test();
