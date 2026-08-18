import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { IOF, brl, aplicarIof, idadeEm } from '@/lib/dominio/regras'

describe('arredondamento monetario', () => {
  it('arredonda meio centavo para cima', () => {
    expect(brl(new Decimal('1.005')).toString()).toBe('1.01')
  })

  it('mantem duas casas', () => {
    expect(brl(new Decimal('45265.2')).toFixed(2)).toBe('45265.20')
  })
})

describe('IOF', () => {
  it('e de 0,38 por cento', () => {
    expect(IOF.toString()).toBe('0.0038')
  })

  it('aplica sobre o premio liquido', () => {
    const comIof = aplicarIof(new Decimal('45093.84'))
    expect(brl(comIof).toFixed(2)).toBe('45265.20')
  })
})

describe('idade', () => {
  it('conta anos completos na data da simulacao', () => {
    expect(idadeEm(new Date('1986-01-01'), new Date('2026-01-14'))).toBe(40)
  })

  it('nao conta o ano quando o aniversario ainda nao chegou', () => {
    expect(idadeEm(new Date('1986-06-15'), new Date('2026-01-14'))).toBe(39)
  })

  it('conta o ano no dia exato do aniversario', () => {
    expect(idadeEm(new Date('1986-01-14'), new Date('2026-01-14'))).toBe(40)
  })
})
