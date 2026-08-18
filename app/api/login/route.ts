import { NextResponse } from 'next/server'
import { verificarSenha } from '@/lib/auth/senha'
import { assinarSessao } from '@/lib/auth/sessao'
import { bloqueado, registrarTentativa } from '@/lib/auth/limite'
import {
  COOKIE_SESSAO,
  DURACAO_SESSAO_SEGUNDOS,
  ipDoCliente,
  segredoObrigatorio,
} from '@/lib/auth/config'

// scrypt vem de node:crypto, que nao existe no Edge Runtime.
export const runtime = 'nodejs'

export async function POST(requisicao: Request) {
  const ip = ipDoCliente(requisicao)

  // Antes de qualquer coisa cara: scrypt custa ~100ms e 32MB por chamada, e
  // aqui ainda nao ha autenticacao nenhuma.
  if (bloqueado(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429 },
    )
  }

  let senha: unknown
  try {
    senha = (await requisicao.json())?.senha
  } catch {
    senha = undefined
  }

  if (typeof senha !== 'string' || senha.length === 0) {
    registrarTentativa(ip)
    return NextResponse.json({ erro: 'Senha invalida.' }, { status: 400 })
  }

  const confere = await verificarSenha(senha, segredoObrigatorio('APP_SENHA_HASH'))
  if (!confere) {
    registrarTentativa(ip)
    // Mensagem generica: nao confirma nem nega nada sobre a senha correta.
    return NextResponse.json({ erro: 'Senha invalida.' }, { status: 401 })
  }

  const token = await assinarSessao(
    segredoObrigatorio('APP_SESSAO_SEGREDO'),
    DURACAO_SESSAO_SEGUNDOS,
  )

  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true, // JavaScript da pagina nao consegue ler
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  })
  return resposta
}
