import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Apenas a URL do projeto e a chave pública (anon/publishable) ficam no
// frontend. Essa chave foi feita para ser exposta: o acesso aos dados é
// controlado pelas políticas de RLS do banco. A chave service_role nunca
// deve aparecer aqui nem em nenhuma variável VITE_*.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const isSupabaseConfigured = Boolean(url && publishableKey)

// Sem as variáveis de ambiente, o app funciona normalmente, só sem login e
// sem histórico salvo.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, publishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
