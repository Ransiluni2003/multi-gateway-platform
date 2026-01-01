import { createClient } from '@supabase/supabase-js';

async function testSignedUrl() {
  const supabase = createClient('https://hswssbxsvwevddkiwwek.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzd3NzYnhzdndldmRka2l3d2VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NjcwOSwiZXhwIjoyMDc3MTYyNzA5fQ.FBz4vVRytecKlrmKyTmk5jentUTL_L5ZrdWXund5SqY');
  const { data, error } = await supabase.storage
    .from('platform-assets')
    .createSignedUrl('Form I-3A - week 13.pdf', 10);
  console.log('DATA:', data);
  console.log('ERROR:', error);
}

testSignedUrl();
