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
  // A expectativa vem da TARIFA, o dado de entrada, e nao do premio de R$ 1mm
  // ja arredondado: arredondar antes de escalar amplifica o erro pelo fator
  // (a 2 casas, x10 desloca o resultado em ate 5 centavos).
  const taxa = repo.tarifa('ICATU_HORIZONTE_WL10', 'M', 40)!.taxaAnualPor1mm

  it.each(['0.5', '2', '3.7', '10'])('escala proporcionalmente com fator %s', (fator) => {
    const capital = new Decimal('1000000').times(fator)
    const c = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, capital)
    const esperado = taxa.times(fator).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    expect(c.premioAnual.toFixed(2)).toBe(esperado.toFixed(2))
  })

  it('nao embute taxa fixa de apolice', () => {
    const um = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, new Decimal('1000000'))
    const dez = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, new Decimal('10000000'))
    // Houvesse uma taxa fixa F, dez - 10x um valeria -9F. Sem ela, sobra
    // apenas o ruido de arredondamento do premio de referencia.
    const residuo = dez.premioAnual.minus(um.premioAnual.times(10)).abs()
    expect(residuo.lessThan(new Decimal('0.05'))).toBe(true)
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
