import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'

describe('produtos', () => {
  it('devolve os 6 produtos', () => {
    expect(repositorioJson.produtos()).toHaveLength(6)
  })

  it('encontra um produto por id', () => {
    const produto = repositorioJson.produto('MAG_WL_INTEGRAL_10')
    expect(produto).toBeDefined()
    expect(produto?.seguradora).toBe('MAG')
  })

  it('devolve undefined para id inexistente', () => {
    expect(repositorioJson.produto('NAO_EXISTE')).toBeUndefined()
  })
})

describe('tarifa', () => {
  it('encontra a tarifa e devolve taxaAnualPor1mm como Decimal', () => {
    const tarifa = repositorioJson.tarifa('MAG_WL_INTEGRAL_10', 'M', 40)
    expect(tarifa).toBeDefined()
    expect(tarifa?.taxaAnualPor1mm).toBeInstanceOf(Decimal)
    expect(tarifa?.taxaAnualPor1mm.toString()).toBe('45093.843395')
  })

  it('devolve undefined para combinacao inexistente', () => {
    expect(repositorioJson.tarifa('MAG_WL_INTEGRAL_10', 'M', 200)).toBeUndefined()
  })

  it('traz capitalMax como Decimal quando existe limite', () => {
    const tarifa = repositorioJson.tarifa('MAG_WL_SUCESSAO_10', 'M', 79)
    expect(tarifa).toBeDefined()
    expect(tarifa?.capitalMax).toBeInstanceOf(Decimal)
    expect(tarifa?.capitalMax?.toString()).toBe('700000')
  })

  it('traz capitalMax como null quando nao ha limite', () => {
    const tarifa = repositorioJson.tarifa('MAG_WL_INTEGRAL_10', 'M', 40)
    expect(tarifa?.capitalMax).toBeNull()
  })
})

describe('resgate', () => {
  it('encontra o resgate e traz o breakevenReal', () => {
    const resgate = repositorioJson.resgate('ICATU_HORIZONTE_WL10', 'F', 18)
    expect(resgate).toBeDefined()
    expect(resgate?.breakevenReal).toBe(10)
    expect(resgate?.resgate10aPor1mm).toBeInstanceOf(Decimal)
  })

  it('devolve undefined para combinacao inexistente', () => {
    expect(repositorioJson.resgate('ICATU_HORIZONTE_WL10', 'F', 200)).toBeUndefined()
  })
})
