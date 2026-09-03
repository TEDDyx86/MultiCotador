import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com permissoes administrativas (Service Role).
 *
 * ATENCAO DE SEGURANCA:
 * A chave SUPABASE_SERVICE_ROLE_KEY ignora politicas de Row Level Security (RLS).
 * NUNCA deve ser exposta ao navegador ou utilizada em rotas publicas sem controle.
 *
 * Utilizada exclusivamente por scripts CLI administrativos (ex: scripts/criar-usuario.ts).
 */
export function criarClienteAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('O cliente admin do Supabase nao pode ser executado no navegador!')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL nao configurada no ambiente.')
  }

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY nao configurada no ambiente. ' +
        'Esta chave e obrigatoria para comandos administrativos.',
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
