import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

/**
 * Cria o cliente Supabase para uso no lado do servidor (Server Components,
 * Server Actions e Route Handlers).
 *
 * Utiliza o adaptador de cookies assinado pelo Next.js (next/headers).
 * Garante que cookies de autenticacao tenham flags seguras:
 * httpOnly: true (impede acesso via JavaScript do navegador / mitiga XSS)
 * secure: true em producao (somente transmitido via HTTPS)
 * sameSite: 'lax' (mitiga CSRF)
 * path: '/'
 */
export async function criarClienteServidor() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nao configuradas. ' +
        'Preencha no seu .env.local.',
    )
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          })
        } catch {
          // O metodo setAll foi chamado de um Server Component onde cookies sao somente leitura.
          // O proxy (proxy.ts) gerencia a renovacao automatica dos tokens de sessao.
        }
      },
    },
  })
}

/**
 * Obtem o usuario autenticado com validacao estrita do token junto ao Supabase.
 *
 * OWASP Best Practice: Usa `supabase.auth.getUser()` em vez de `getSession()`
 * para garantir que o JWT e validado criptograficamente contra o servidor de auth,
 * prevenindo sessoes forjadas ou revogadas.
 */
export async function obterUsuarioAtual(): Promise<User | null> {
  try {
    const supabase = await criarClienteServidor()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch {
    return null
  }
}
