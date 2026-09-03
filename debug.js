import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zofatjejtcjdocggvtid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZmF0amVqdGNqZG9jZ2d2dGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDA2NzcsImV4cCI6MjA5MzUxNjY3N30.SbFRE2jzNyS5EimmNCAWgJGzLppsGAIMNhk_i-JTb4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const { data: countData, count, error } = await supabase.from('accessories').select('*', { count: 'exact', head: true });
    console.log(`Total rows in accessories table: ${count}`);
    
    // Check if there are any profiles at all
    const { data: cProfiles, count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log(`Total profiles: ${pCount}`);
  } catch (error) {
    console.error(error);
  }
}

debug();
