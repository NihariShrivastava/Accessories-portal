const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zofatjejtcjdocggvtid.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E');

async function clearData() {
  console.log('Clearing drawer_transactions...');
  const { error: err1 } = await supabase.from('drawer_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Drawer tx delete error:', err1 ? err1.message : 'Success');

  console.log('Looking for chetak-narayannagar...');
  const { data: profiles } = await supabase.from('profiles').select('id').eq('name', 'chetak-narayannagar');
  if (profiles && profiles.length > 0) {
    const counterId = profiles[0].id;
    console.log('Found counter id:', counterId);
    const { error: err2 } = await supabase.from('bills').delete().eq('counter_id', counterId);
    console.log('Bills delete error:', err2 ? err2.message : 'Success');
  } else {
    console.log('Counter not found. Looking for similar names...');
    const { data: allProfiles } = await supabase.from('profiles').select('name');
    console.log('Available profiles:', allProfiles?.map(p => p.name).join(', '));
  }
}
clearData();
