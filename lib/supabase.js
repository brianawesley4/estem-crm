import { createClient } from '@supabase/supabase-js'

const SB_URL = 'https://yuofrxupqbjoysafvowb.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1b2ZyeHVwcWJqb3lzYWZ2b3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTIzODAsImV4cCI6MjA5NTgyODM4MH0.-b8iesaEHZVo7BVrfaYVw-FnPUeFECpmF0zzgqrHtvo'

export const supabase = createClient(SB_URL, SB_KEY)
