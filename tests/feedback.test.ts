import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ehTipoFeedback,
  sanitizarMensagem,
  sanitizarPagina,
  TAMANHO_MAXIMO_MENSAGEM,
  TIPOS_FEEDBACK,
} from '@/lib/feedback/validacao'

describe('tipo do feedback', () => {
  it('aceita os quatro tipos previstos', () => {
    for (const t of TIPOS_FEEDBACK) expect(ehTipoFeedback(t)).toBe(true)
  })

  it('recusa qualquer outro valor', () => {
    for (const v of ['BUG', 'sugestao', '', null, undefined, 3, {}]) {
      expect(ehTipoFeedback(v)).toBe(false)
    }
  })
})

describe('mensagem do feedback', () => {
  it('tira espacos das pontas', () => {
    expect(sanitizarMensagem('  o botao nao responde  ')).toBe('o botao nao responde')
  })

  it('recusa vazio e so espaco', () => {
    // Um envio acidental nao pode virar registro para o avaliador ler depois.
    for (const v of ['', '   ', '\n\t ']) expect(sanitizarMensagem(v)).toBeNull()
  })

  it('recusa o que nao e texto', () => {
    for (const v of [null, undefined, 42, {}, []]) expect(sanitizarMensagem(v)).toBeNull()
  })

  it('aceita ate o limite e recusa um caractere acima', () => {
    expect(sanitizarMensagem('a'.repeat(TAMANHO_MAXIMO_MENSAGEM))).toHaveLength(
      TAMANHO_MAXIMO_MENSAGEM,
    )
    expect(sanitizarMensagem('a'.repeat(TAMANHO_MAXIMO_MENSAGEM + 1))).toBeNull()
  })

  it('mede depois de aparar, e nao antes', () => {
    const comEspacos = ` ${'a'.repeat(TAMANHO_MAXIMO_MENSAGEM)} `
    expect(sanitizarMensagem(comEspacos)).toHaveLength(TAMANHO_MAXIMO_MENSAGEM)
  })
})

describe('pagina de origem', () => {
  it('guarda a rota quando informada', () => {
    expect(sanitizarPagina('/?cliente=1')).toBe('/?cliente=1')
  })

  it('vira null quando ausente, em vez de derrubar o envio', () => {
    for (const v of [undefined, null, '', '   ', 7]) expect(sanitizarPagina(v)).toBeNull()
  })

  it('trunca em vez de recusar, porque e so contexto', () => {
    expect(sanitizarPagina('/x'.repeat(600))).toHaveLength(512)
  })
})

/*
 * A aplicacao e o banco precisam concordar. Se alguem acrescentar um tipo no
 * SQL e esquecer daqui, o botao novo some da tela; se acrescentar aqui e
 * esquecer do SQL, o envio falha com erro de constraint na cara do avaliador.
 */
describe('acordo entre a validacao e a tabela', () => {
  const sql = readFileSync('docs/supabase-feedbacks.sql', 'utf8')

  it('usa os mesmos tipos declarados no check da tabela', () => {
    const check = sql.match(/tipo\s+text\s+not null\s+check\s*\(tipo in \(([^)]+)\)\)/i)
    expect(check).not.toBeNull()
    const noSql = check![1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort()
    expect(noSql).toEqual([...TIPOS_FEEDBACK].sort())
  })

  it('usa o mesmo teto de mensagem declarado na tabela', () => {
    const entre = sql.match(/char_length\(mensagem\)\s+between\s+1\s+and\s+(\d+)/i)
    expect(entre).not.toBeNull()
    expect(Number(entre![1])).toBe(TAMANHO_MAXIMO_MENSAGEM)
  })
})
