import { NextResponse, type NextRequest } from 'next/server'
import { verificarSessao } from '@/lib/auth/sessao'
import { COOKIE_SESSAO } from '@/lib/auth/config'

const TAMANHO_MINIMO_SEGREDO = 32

/**
 * Bloqueia tudo que nao tenha cookie de sessao valido.
 *
 * Roda no Edge Runtime, entao so pode usar Web Crypto — por isso verifica a
 * assinatura do cookie em vez da senha. A senha e verificada uma unica vez,
 * na rota de login, que roda em Node.
 */
export async function middleware(requisicao: NextRequest) {
  const segredo = process.env.APP_SESSAO_SEGREDO

  // Sem segredo, ou com segredo curto demais para ser seguro, negar tudo.
  // Falhar aberto deixaria a aplicacao exposta silenciosamente.
  if (!segredo || segredo.length < TAMANHO_MINIMO_SEGREDO) {
    return new NextResponse('Aplicacao nao configurada.', { status: 503 })
  }

  const token = requisicao.cookies.get(COOKIE_SESSAO)?.value
  if (token && (await verificarSessao(segredo, token))) {
    return NextResponse.next()
  }

  const url = requisicao.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  /**
   * Protege tudo, menos:
   *  - /login e /api/login, senao ninguem consegue entrar
   *  - /_next/* e favicon, arquivos estaticos do proprio framework
   *
   * A rota de API do comparativo fica protegida de proposito: deixar o calculo
   * aberto anularia a tranca da tela.
   */
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
}
