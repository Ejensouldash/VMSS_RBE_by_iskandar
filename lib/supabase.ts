import { createClient } from '@supabase/supabase-js';

// Ambil kunci dari fail .env atau environment
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
                    'https://kkgsxqduohherpxyucyc.supabase.co';

const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_KEY) || 
                    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_KEY) || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_test';

export const supabase = createClient(supabaseUrl, supabaseKey);