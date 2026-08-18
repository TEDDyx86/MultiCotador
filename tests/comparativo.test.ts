import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'

describe('comparativo — caso de referencia John Daniel', () => {
  const r = montarComparativo(repo, 'M', 50, new Decimal('1000000'))

  it('traz as quatro seguradoras do comparativo', () => {
    expect(r.linhas.map((l) => l.seguradora)).toEqual([
      'MAG', 'MetLife', 'Prudential', 'Icatu',
    ])
  })

  it('reproduz os aportes anuais do documento', () => {
    expect(r.linhas.map((l) => l.aporteAnual.toFixed(2))).toEqual([
      '57248.94', '59922.68', '60542.49', '63053.16',
    ])
  })

  it('reproduz os aportes acumulados em dez anos', () => {
    expect(r.linhas.map((l) => l.aporteAcumulado10a.toFixed(2))).toEqual([
      '572489.40', '599226.80', '605424.90', '630531.60',
    ])
  })

  it('reproduz o custo sobre o capital segurado', () => {
    expect(r.linhas.map((l) => l.custoSobreCapital.toFixed(1))).toEqual([
      '57.2', '59.9', '60.5', '63.1',
    ])
  })

  it('reproduz os valores de resgate no decimo ano', () => {
    expect(r.linhas.map((l) => l.resgate10a.toFixed(2))).toEqual([
      '574354.16', '606160.60', '613200.00', '630531.65',
    ])
  })

  it('reproduz o valor preservado em dez anos', () => {
    expect(r.valorPreservado.toFixed(2)).toBe('58042.20')
  })

  it('apresenta sempre o decimo ano como break-even no documento', () => {
    expect(r.linhas.every((l) => l.breakevenDocumento === 10)).toBe(true)
  })
})

describe('comparativo — informacao interna para o corretor', () => {
  it('expoe o break-even real, que difere do documento acima de 55 anos', () => {
    const r = montarComparativo(repo, 'M', 62, new Decimal('1000000'))
    const mag = r.linhas.find((l) => l.seguradora === 'MAG')!
    expect(mag.breakevenDocumento).toBe(10)
    expect(mag.breakevenReal).toBeNull()
  })

  it('marca que o resgate nao alcanca o aportado quando e o caso', () => {
    const r = montarComparativo(repo, 'M', 62, new Decimal('1000000'))
    const mag = r.linhas.find((l) => l.seguradora === 'MAG')!
    expect(mag.resgate10a.lessThan(mag.aporteAcumulado10a)).toBe(true)
  })
})

describe('comparativo — escala com o capital', () => {
  it('dobra os valores quando o capital dobra', () => {
    const um = montarComparativo(repo, 'F', 40, new Decimal('1000000'))
    const dois = montarComparativo(repo, 'F', 40, new Decimal('2000000'))
    expect(dois.linhas[0].aporteAnual.toFixed(2))
      .toBe(um.linhas[0].aporteAnual.times(2).toFixed(2))
  })
})

describe('comparativo — nenhuma linha sai com resgate zerado', () => {
  // Um resgate de R$ 0,00 no documento le como "este produto nao tem resgate",
  // quando a causa real e dado ausente. Os quatro produtos do comparativo TEM
  // resgate por definicao, entao zero ali e sempre defeito, nunca informacao.
  it('em toda a faixa etaria e nos dois sexos', () => {
    const zerados: string[] = []
    for (const sexo of ['M', 'F'] as const) {
      for (let idade = 14; idade <= 80; idade++) {
        for (const l of montarComparativo(repo, sexo, idade, new Decimal('1000000')).linhas) {
          if (l.resgate10a.isZero()) {
            zerados.push(`${l.seguradora} ${sexo} ${idade} anos`)
          }
        }
      }
    }
    expect(zerados).toEqual([])
  })
})
