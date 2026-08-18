import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import gabarito from '@/dados/gabarito.json'
import { cotar } from '@/lib/motor/cotacao'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'
import type { Sexo } from '@/lib/dominio/tipos'

interface CasoGabarito {
  produtoId: string
  sexo: string
  idade: number
  capital: string
  premioAnualComIofEsperado: string
  origem: string
}

const CASOS = gabarito as CasoGabarito[]

describe('regressao contra os estudos reais das seguradoras', () => {
  it('o gabarito tem os 719 casos esperados', () => {
    expect(CASOS.length).toBe(719)
  })

  it('reproduz todos os estudos com centavo exato', () => {
    const divergentes: string[] = []

    for (const caso of CASOS) {
      const c = cotar(
        repo,
        caso.produtoId,
        caso.sexo as Sexo,
        caso.idade,
        new Decimal(caso.capital),
      )
      const obtido = c.premioAnualComIof.toFixed(2)
      const esperado = new Decimal(caso.premioAnualComIofEsperado).toFixed(2)
      if (obtido !== esperado) {
        divergentes.push(`${caso.origem}: esperado ${esperado}, obtido ${obtido}`)
      }
    }

    expect(divergentes).toEqual([])
  })
})
