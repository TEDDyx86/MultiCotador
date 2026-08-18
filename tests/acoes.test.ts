import { describe, it, expect } from 'vitest'
import { cotarComparativo } from '@/app/acoes'

describe('acao de cotacao', () => {
  it('devolve as quatro seguradoras do comparativo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.comparativo.map((l) => l.seguradora)).toEqual([
      'MAG', 'MetLife', 'Prudential', 'Icatu',
    ])
  })

  it('reproduz os aportes do documento de referencia', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 50, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.comparativo.map((l) => l.aporteAnual)).toEqual([
      'R$ 57.248,94', 'R$ 59.922,68', 'R$ 60.542,49', 'R$ 63.053,16',
    ])
  })

  it('devolve os seis produtos na lista completa', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.todos.length).toBe(6)
  })

  it('lista os indisponiveis com o motivo', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 79, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    expect(r.indisponiveis.length).toBeGreaterThan(0)
    expect(r.indisponiveis.some((i) => /700/.test(i.motivo))).toBe(true)
  })

  it('recusa idade fora de qualquer produto', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 120, capital: '1000000' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital nao numerico', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: 'abc' })
    expect(r.ok).toBe(false)
  })

  it('recusa capital zero', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 40, capital: '0' })
    expect(r.ok).toBe(false)
  })

  it('aceita capital acima de um milhao com centavos', async () => {
    const r = await cotarComparativo({ sexo: 'F', idade: 40, capital: '2500000.55' })
    expect(r.ok).toBe(true)
  })

  it('expoe o break-even real, diferente do documento', async () => {
    const r = await cotarComparativo({ sexo: 'M', idade: 62, capital: '1000000' })
    if (!r.ok) throw new Error('deveria ter cotado')
    const mag = r.comparativo.find((l) => l.seguradora === 'MAG')!
    expect(mag.breakevenDocumento).toBe(10)
    expect(mag.breakevenReal).toBeNull()
  })
})
