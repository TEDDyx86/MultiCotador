import { NextResponse } from 'next/server'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { bloqueado, limparIp, registrarTentativa } from '@/lib/auth/limite'
import { ipDoCliente } from '@/lib/auth/config'
import {
  sanitizarEmail,
  validarSenha,
  MENSAGEM_ERRO_LOGIN_GENERICA,
} from '@/lib/auth/validacao'

export const runtime = 'nodejs'

interface CorpoLogin {
  email?: unknown
  senha?: unknown
}

export async function POST(requisicao: Request) {
  const ip = ipDoCliente(requisicao)

  // OWASP A07: Protecao contra forca bruta e credential stuffing por IP
  if (bloqueado(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '900',
        },
      },
    )
  }

  let corpo: CorpoLogin
  try {
    corpo = await requisicao.json()
  } catch {
    corpo = {}
  }

  const email = sanitizarEmail(corpo.email)
  const validacaoSenha = validarSenha(corpo.senha)

  // OWASP Anti-Enumeration (WSTG-ATHN-02):
  // Se o email for malformado ou a senha for invalida, retornamos a MESMA
  // mensagem generica para impedir que um atacante descubra se um email existe.
  if (!email || !validacaoSenha.valido || typeof corpo.senha !== 'string') {
    registrarTentativa(ip)
    return NextResponse.json(
      { erro: MENSAGEM_ERRO_LOGIN_GENERICA },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  try {
    const supabase = await criarClienteServidor()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: corpo.senha,
    })

    if (error || !data.session || !data.user) {
      registrarTentativa(ip)
      return NextResponse.json(
        { erro: MENSAGEM_ERRO_LOGIN_GENERICA },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        },
      )
    }

    // Sucesso: reseta historico de tentativas deste IP
    limparIp(ip)

    return NextResponse.json(
      {
        ok: true,
        usuario: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      },
    )
  } catch (err) {
    // Falha de infraestrutura (ex: variaveis do Supabase nao configuradas)
    console.error('Erro na autenticacao:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { erro: 'Serviço de autenticação temporariamente indisponível.' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
