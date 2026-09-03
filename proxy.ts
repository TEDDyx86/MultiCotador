import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
 * Bloqueia tudo que nao tenha sessao autenticada e valida no Supabase.
 *
 * Atualiza cookies de sessao automaticamente em transito quando renovados.
 * Roda no Edge Runtime/Proxy, utilizando @supabase/ssr com Web Crypto.
 */
export async function proxy(requisicao: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Falha fechado: sem configuracao, bloqueia tudo para evitar exposicao acidental.
  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse('Aplicacao nao configurada.', { status: 503 })
  }

  let resposta = NextResponse.next({
    request: {
      headers: requisicao.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return requisicao.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => requisicao.cookies.set(name, value))
        resposta = NextResponse.next({
          request: requisicao,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          }),
        )
      },
    },
  })

  // OWASP A01 / A07: getUser valida criptograficamente a sessao contra o Supabase.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (user && !error) {
    return resposta
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
