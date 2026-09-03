export const COOKIE_SESSAO = 'mc_sessao'

/** Oito horas: cobre um dia de trabalho sem exigir novo login. */
export const DURACAO_SESSAO_SEGUNDOS = 8 * 60 * 60

/** Um HMAC-SHA256 com chave curta e forjavel na pratica. */
const TAMANHO_MINIMO_SEGREDO = 32

export type VariavelConfiguracao =
  | 'APP_SENHA_HASH'
  | 'APP_SESSAO_SEGREDO'
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'

/**
 * Le uma variavel obrigatoria. Falha alto e cedo — uma aplicacao que sobe sem
 * segredo configurado ficaria aberta sem ninguem perceber.
 */
export function segredoObrigatorio(nome: VariavelConfiguracao): string {
  const valor = process.env[nome]
  if (!valor) {
    throw new Error(
      `Variavel de ambiente ${nome} nao configurada. ` +
        `Copie .env.example para .env.local e preencha.`,
    )
  }
  if (nome === 'APP_SESSAO_SEGREDO' && valor.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(
      `APP_SESSAO_SEGREDO tem ${valor.length} caracteres; o minimo e ` +
        `${TAMANHO_MINIMO_SEGREDO}. Chave curta torna o cookie de sessao forjavel. ` +
        `Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    )
  }
  return valor
}

/**
 * Extrai o IP do cliente. Prefere x-real-ip, que a Vercel define na borda;
 * x-forwarded-for pode ser forjado pelo cliente em ambientes sem proxy
 * confiavel, e ai o limite de tentativas seria contornavel trocando o header.
 */
export function ipDoCliente(requisicao: Request): string {
  const real = requisicao.headers.get('x-real-ip')
  if (real) return real.trim()
  const encaminhado = requisicao.headers.get('x-forwarded-for')
  if (encaminhado) return encaminhado.split(',')[0].trim()
  return 'desconhecido'
}
