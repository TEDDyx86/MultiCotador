/**
 * Validacao do feedback enviado pelos avaliadores.
 *
 * Os limites aqui espelham as restricoes da tabela em docs/supabase-feedbacks.sql
 * de proposito. Sem isso, uma mensagem de 2001 caracteres passaria pela aplicacao
 * e o banco a recusaria com um erro de constraint — que chegaria ao avaliador
 * como "nao foi possivel enviar", sem dizer o que fazer, e ainda deixaria um
 * rastro de erro de infraestrutura no log para algo que e apenas entrada longa.
 */

/** Precisa casar com o `check (tipo in (...))` da tabela. */
export const TIPOS_FEEDBACK = ['bug', 'melhoria', 'duvida', 'outro'] as const

export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number]

export const ROTULO_TIPO: Record<TipoFeedback, string> = {
  bug: 'Erro',
  melhoria: 'Melhoria',
  duvida: 'Dúvida',
  outro: 'Outro',
}

/** Precisa casar com o `char_length(mensagem) between 1 and 2000` da tabela. */
export const TAMANHO_MAXIMO_MENSAGEM = 2000

/**
 * A pagina e so contexto de onde o feedback partiu. Nao ha limite no banco, e
 * por isso mesmo convem um aqui: e um campo que chega do cliente e ninguem le
 * de perto.
 */
const TAMANHO_MAXIMO_PAGINA = 512

export function ehTipoFeedback(valor: unknown): valor is TipoFeedback {
  return typeof valor === 'string' && (TIPOS_FEEDBACK as readonly string[]).includes(valor)
}

/**
 * Devolve a mensagem sem espacos nas pontas, ou null quando vazia ou longa
 * demais. Espaco em branco sozinho conta como vazio: um envio acidental nao
 * deve virar um registro para o avaliador ler depois.
 */
export function sanitizarMensagem(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  if (limpo.length === 0 || limpo.length > TAMANHO_MAXIMO_MENSAGEM) return null
  return limpo
}

/** A rota de origem, truncada. Ausente ou invalida vira null, e nao erro. */
export function sanitizarPagina(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  if (limpo.length === 0) return null
  return limpo.slice(0, TAMANHO_MAXIMO_PAGINA)
}
