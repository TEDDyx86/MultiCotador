import { NextResponse, type NextRequest } from 'next/server'
import { verificarSessao } from '@/lib/auth/sessao'
import { COOKIE_SESSAO } from '@/lib/auth/config'

const TAMANHO_MINIMO_SEGREDO = 32

/**
 * Padrao das rotas protegidas. Protege tudo, menos:
 *  - /login e /api/login, senao ninguem consegue entrar
 *  - /_next/* e favicon, arquivos estaticos do proprio framework
 *
 * As excecoes sao ancoradas de proposito: `login$|login/` casa exatamente a
 * rota /login e o que estiver abaixo dela, e nada mais. A versao anterior
 * excluia por prefixo (`login`), o que deixava /login-antigo e /loginx/segredo
 * liberados — e faria uma futura app/login-admin/page.tsx nascer desprotegida
 * sem ninguem perceber.
 *
 * A rota de API do comparativo fica protegida de proposito: deixar o calculo
 * aberto anularia a tranca da tela.
 *
 * `marcas/` fica de fora porque sao os arquivos de public/marcas: as logos das
 * seguradoras, a marca do corretor e a textura do cabecalho. Proteger imagem de
 * marca nao acrescenta seguranca — sao publicas por natureza — e protege-las
 * quebra a tela: um background-image em CSS e a tela de login nao carregam
 * cookie de sessao, entao viriam com redirecionamento no lugar do arquivo.
 * O que precisa ficar trancado sao as tarifas, e elas nunca saem do servidor.
 *
 * Exportado para poder ser testado diretamente em tests/matcher.test.ts.
 */
export const PADRAO_ROTAS_PROTEGIDAS =
  '/((?!login$|login/|api/login$|_next/static|_next/image|marcas/|favicon\\.ico).*)'

/**
 * Bloqueia tudo que nao tenha cookie de sessao valido.
 *
 * Roda no Edge Runtime, entao so pode usar Web Crypto — por isso verifica a
 * assinatura do cookie em vez da senha. A senha e verificada uma unica vez,
 * na rota de login, que roda em Node.
 */
export async function proxy(requisicao: NextRequest) {
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

  // Chamada de API sem sessao valida recebe JSON, nao redirect: um fetch()
  // seguiria o 307 e leria o HTML da tela de login como se fosse a resposta
  // da API — bug caro de diagnosticar.
  if (requisicao.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Sessao expirada.' }, { status: 401 })
  }

  const url = requisicao.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

/**
 * O Next exige literais estaticas aqui: `matcher: [PADRAO_ROTAS_PROTEGIDAS]`
 * quebra o build ("need to be static strings"). A duplicacao e obrigatoria,
 * entao tests/matcher.test.ts trava as duas juntas.
 */
export const config = {
  matcher: [
    '/((?!login$|login/|api/login$|_next/static|_next/image|marcas/|favicon\\.ico).*)',
  ],
}
