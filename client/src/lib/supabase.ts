import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseKey) {
  console.error('Supabase key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
