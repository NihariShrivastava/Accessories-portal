
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounters() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total Profiles:', data.length);
  console.log('All Profiles:', data.map(p => ({ id: p.id, name: p.name, role: p.role })));
}

checkCounters();
