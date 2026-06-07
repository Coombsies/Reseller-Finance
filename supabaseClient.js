import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js'

const supabaseUrl = 'https://dzvgbytxbifhnxckmiih.supabase.co'
const supabaseAnonKey = 'sb_publishable_pvsbykWKiWvRUZsWiabvIQ_pMIRKZ2R'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)