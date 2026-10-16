import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

import { checkIsAdmin } from "../services/feedbackService"
import { supabase } from "../services/supabaseClient"

// Diz se o usuário logado é administrador. A verificação real acontece no
// banco: mesmo que alguém force este valor no navegador, as políticas de RLS
// não devolvem nenhuma avaliação para quem não é administrador.
export function useIsAdmin(session: Session | null): boolean {
  const [result, setResult] = useState<{ userId: string; isAdmin: boolean } | null>(
    null
  )
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!supabase || !userId) {
      return
    }

    let active = true

    checkIsAdmin(supabase).then((isAdmin) => {
      if (active) {
        setResult({ userId, isAdmin })
      }
    })

    return () => {
      active = false
    }
  }, [userId])

  return Boolean(userId && result?.userId === userId && result.isAdmin)
}
