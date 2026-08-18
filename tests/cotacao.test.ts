import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { cotar, TarifaIndisponivel } from '@/lib/motor/cotacao'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'

describe('cotacao basica', () => {
  it('reproduz o estudo da MAG para homem de 40 anos', () => {
    const c = cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('1000000'))
    expect(c.premioAnualComIof.toFixed(2)).toBe('45265.20')
  })

  it('calcula o mensal dividindo o anual por doze', () => {
    const c = cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('1000000'))
    expect(c.premioMensalComIof.toFixed(2)).toBe('3772.10')
  })
})

describe('linearidade do capital', () => {
  const base = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, new Decimal('1000000'))

  it.each(['0.5', '2', '3.7', '10'])('escala proporcionalmente com fator %s', (fator) => {
    const capital = new Decimal('1000000').times(fator)
    const c = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, capital)
    const esperado = base.premioAnual.times(fator).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    expect(c.premioAnual.toFixed(2)).toBe(esperado.toFixed(2))
  })

  it('aceita capital com centavos', () => {
    const c = cotar(repo, 'PRUDENTIAL_VIDA_INTEIRA_10', 'F', 33, new Decimal('1234567.89'))
    expect(c.premioAnualComIof.dividedBy(c.premioAnual).toFixed(6)).toBe('1.003800')
  })
})

describe('elegibilidade', () => {
  it('recusa idade fora da faixa do produto', () => {
    expect(() => cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 79, new Decimal('1000000')))
      .toThrow(TarifaIndisponivel)
  })

  it('respeita o teto de capital da MAG Sucessao aos 79 anos', () => {
    expect(() => cotar(repo, 'MAG_WL_SUCESSAO_10', 'M', 79, new Decimal('1000000')))
      .toThrow(/700/)
  })

  it('aceita capital dentro do teto', () => {
    const c = cotar(repo, 'MAG_WL_SUCESSAO_10', 'M', 79, new Decimal('700000'))
    expect(c.premioAnualComIof.toFixed(2)).toBe('59090.95')
  })

  it('recusa capital zero ou negativo', () => {
    expect(() => cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('0')))
      .toThrow(/positivo/)
  })
})
