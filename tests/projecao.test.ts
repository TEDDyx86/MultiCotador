import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { projetarPorIpca } from '@/lib/motor/projecao'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'

const CINCO = new Decimal('0.05')
const CAPITAL = new Decimal('1000000')

/** Mesmo perfil do estudo de referencia. */
const nominal = montarComparativo(repo, 'M', 50, CAPITAL)
const projetado = projetarPorIpca(nominal, CINCO)

const mag = () => projetado.linhas[0]
const magNominal = () => nominal.linhas[0]

describe('projecao por IPCA — caso de referencia', () => {
  it('nao mexe no aporte anual, que e o do primeiro ano', () => {
    expect(mag().aporteAnual.toFixed(2)).toBe('57248.94')
    expect(mag().aporteAnual.equals(magNominal().aporteAnual)).toBe(true)
  })

  it('acumula os dez aportes pela serie, e nao pelo valor unico', () => {
    // 57.248,94 x 12,577893
    expect(mag().aporteAcumulado10a.toFixed(2)).toBe('720071.02')
    // O erro que se quer evitar: 572.489,40 x 1,628895 = 932.524,91
    expect(mag().aporteAcumulado10a.lessThan(932524)).toBe(true)
  })

  it('projeta o resgate pelo fator de valor unico', () => {
    // 574.354,16 x 1,628895
    expect(mag().resgate10a.toFixed(2)).toBe('935562.41')
  })

  it('derruba o custo sobre o capital, porque o capital acompanha', () => {
    expect(magNominal().custoSobreCapital.toString()).toBe('57.2')
    expect(mag().custoSobreCapital.toString()).toBe('44.2')
  })

  it('mantem o break-even do estudo oficial', () => {
    for (let i = 0; i < projetado.linhas.length; i++) {
      expect(projetado.linhas[i].breakevenDocumento).toBe(nominal.linhas[i].breakevenDocumento)
      expect(projetado.linhas[i].breakevenReal).toBe(nominal.linhas[i].breakevenReal)
    }
  })

  it('preserva a ordem e as seguradoras', () => {
    expect(projetado.linhas.map((l) => l.seguradora)).toEqual(
      nominal.linhas.map((l) => l.seguradora),
    )
  })

  it('escala o valor preservado junto com o acumulado', () => {
    const razao = projetado.valorPreservado.dividedBy(nominal.valorPreservado)
    expect(razao.toFixed(4)).toBe('1.2578')
  })
})

describe('projecao por IPCA — bordas', () => {
  it('com taxa zero devolve exatamente o nominal', () => {
    const igual = projetarPorIpca(nominal, new Decimal(0))
    for (let i = 0; i < igual.linhas.length; i++) {
      expect(igual.linhas[i].aporteAcumulado10a.toFixed(2)).toBe(
        nominal.linhas[i].aporteAcumulado10a.toFixed(2),
      )
      expect(igual.linhas[i].resgate10a.toFixed(2)).toBe(
        nominal.linhas[i].resgate10a.toFixed(2),
      )
      expect(igual.linhas[i].custoSobreCapital.toString()).toBe(
        nominal.linhas[i].custoSobreCapital.toString(),
      )
    }
  })

  /*
   * Corrigir os dois lados pelo mesmo indice reexpressa a moeda, nao muda a
   * decisao. Se o ranking mudasse, a projecao estaria distorcendo a comparacao.
   */
  it('nao altera o ranking entre as seguradoras', () => {
    const ordenado = [...projetado.linhas].sort((a, b) => a.aporteAnual.comparedTo(b.aporteAnual))
    expect(ordenado.map((l) => l.seguradora)).toEqual(projetado.linhas.map((l) => l.seguradora))
  })

  it('nao quebra quando nao ha o que comparar', () => {
    const uma = { ...nominal, linhas: nominal.linhas.slice(0, 1) }
    const p = projetarPorIpca(uma, CINCO)
    expect(p.linhas).toHaveLength(1)
    expect(p.valorPreservado.equals(uma.valorPreservado)).toBe(true)
  })
})
