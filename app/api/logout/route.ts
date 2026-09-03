import { NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { COOKIE_SESSAO } from '@/lib/auth/config'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await criarClienteServidor()
    await supabase.auth.signOut()
  } catch {
    // Mesmo se falhar (ex: sem rede), continuamos a limpar os cookies locais
  }

  const resposta = NextResponse.json({ ok: true })
  // Remove cookie legado caso exista
  resposta.cookies.set(COOKIE_SESSAO, '', { path: '/', maxAge: 0 })
  return resposta
}
