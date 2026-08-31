import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  ANOS_PROJECAO,
  IPCA_PADRAO,
  TAXA_INICIAL,
  fatorCustoSobreCapital,
  fatorSerieAportes,
  fatorValorFuturo,
  taxaDePercentual,
} from '@/lib/dominio/indexacao'

const CINCO = new Decimal('0.05')

describe('fatores de indexacao', () => {
  /*
   * Os tres valores conferem numa HP-12C:
   *   1 PV, 5 i, 10 n, FV      -> 1,628895
   *   1 PMT, 5 i, 10 n, FV     -> 12,577893
   */
  it('projeta um valor unico por (1+i)^n', () => {
    expect(fatorValorFuturo(CINCO).toFixed(6)).toBe('1.628895')
  })

  it('projeta a serie de dez aportes, que cresce bem menos', () => {
    expect(fatorSerieAportes(CINCO).toFixed(6)).toBe('12.577893')
  })

  /*
   * A distincao que custa caro: aplicar o fator de valor unico sobre o
   * acumulado inflaria o custo em 63% no lugar dos 26% reais.
   */
  it('mantem a serie bem abaixo de dez vezes o fator de valor unico', () => {
    const errado = fatorValorFuturo(CINCO).times(ANOS_PROJECAO)
    expect(fatorSerieAportes(CINCO).lessThan(errado)).toBe(true)
    expect(errado.dividedBy(fatorSerieAportes(CINCO)).toFixed(3)).toBe('1.295')
  })

  it('com taxa zero, a serie vale o proprio numero de aportes', () => {
    expect(fatorSerieAportes(new Decimal(0)).toString()).toBe('10')
    expect(fatorValorFuturo(new Decimal(0)).toString()).toBe('1')
  })

  it('derruba o custo sobre o capital, porque o capital tambem e corrigido', () => {
    const f = fatorCustoSobreCapital(CINCO)
    expect(f.toFixed(6)).toBe('0.772173')
    // 57,2% do caso de referencia vira 44,2%.
    expect(new Decimal('57.2').times(f).toDecimalPlaces(1).toString()).toBe('44.2')
  })

  it('parte de 5% ao ano, a taxa definida pela area comercial', () => {
    expect(IPCA_PADRAO.times(100).toString()).toBe('5')
  })

  // O campo da tela nasce com o padrao ja escrito. Se o formato sair errado
  // ("5.0", "0.05"), o input abre invalido e a projecao cai no padrao em
  // silencio — o mesmo numero na tela, por outro caminho, sem ninguem notar.
  it('escreve o padrao na tela como o corretor digitaria', () => {
    expect(TAXA_INICIAL).toBe('5')
    expect(taxaDePercentual(TAXA_INICIAL)?.toString()).toBe('0.05')
  })
})

describe('leitura da taxa vinda da tela', () => {
  it('aceita virgula e ponto', () => {
    expect(taxaDePercentual('4,5')?.toString()).toBe('0.045')
    expect(taxaDePercentual('4.5')?.toString()).toBe('0.045')
  })

  it('aceita zero, que e a forma de voltar ao nominal', () => {
    expect(taxaDePercentual('0')?.toString()).toBe('0')
  })

  it('recusa vazio, texto e negativo', () => {
    for (const entrada of ['', '   ', 'abc', '-1', '4,5,6']) {
      expect(taxaDePercentual(entrada)).toBeNull()
    }
  })

  it('recusa taxa fora da faixa, que ja nao seria projecao', () => {
    expect(taxaDePercentual('20')?.toString()).toBe('0.2')
    expect(taxaDePercentual('25')).toBeNull()
  })
})
