import { createClient } from '@supabase/supabase-js';

// These should be configured in .env in a real deployment
// For demonstration and initial setup, we provide placeholder urls
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhb...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
