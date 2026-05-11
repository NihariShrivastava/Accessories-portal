
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteCounters() {
  const ids = ['3d68677f-f975-4d00-8acd-dd6a58683504', '8f48fc8a-6f88-4fa5-937b-9ae3e5136681'];
  
  for (const id of ids) {
    console.log(`Attempting to delete ID: ${id}`);
    const { data, error, count } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting ${id}:`, error);
    } else {
      console.log(`Delete response for ${id}:`, { data, count });
    }
  }
}

deleteCounters();
