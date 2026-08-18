import Decimal from 'decimal.js'
import { BREAKEVEN_DOCUMENTO, CAPITAL_BASE, brl } from '@/lib/dominio/regras'
import type { FonteTarifa, Sexo } from '@/lib/dominio/tipos'
import type { Repositorio } from '@/lib/repositorio/repositorio'
import { TarifaIndisponivel, cotar } from './cotacao'

export interface LinhaComparativo {
  produtoId: string
  seguradora: string
  logo: string
  aporteAnual: Decimal
  aporteAcumulado10a: Decimal
  /** Percentual do capital segurado. */
  custoSobreCapital: Decimal
  /** O que o documento apresenta: sempre o decimo ano, por decisao de negocio. */
  breakevenDocumento: number
  /** O ano em que o resgate realmente alcanca o aportado. Nulo = nunca alcanca. */
  breakevenReal: number | null
  resgate10a: Decimal
  fonteTarifa: FonteTarifa
}

export interface Comparativo {
  linhas: LinhaComparativo[]
  /** Diferenca acumulada entre a opcao mais cara e a recomendada. */
  valorPreservado: Decimal
  indisponiveis: Array<{ produtoId: string; motivo: string }>
}

export function montarComparativo(
  repo: Repositorio,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): Comparativo {
  const linhas: LinhaComparativo[] = []
  const indisponiveis: Array<{ produtoId: string; motivo: string }> = []

  for (const produto of repo.produtos()) {
    if (!produto.entraNoComparativo) continue

    let cotacao
    try {
      cotacao = cotar(repo, produto.id, sexo, idade, capital)
    } catch (erro) {
      if (erro instanceof TarifaIndisponivel) {
        indisponiveis.push({ produtoId: produto.id, motivo: erro.message })
        continue
      }
      throw erro
    }

    const resgate = repo.resgate(produto.id, sexo, idade)
    const acumulado = cotacao.premioAnualComIof.times(10)

    linhas.push({
      produtoId: produto.id,
      seguradora: produto.seguradora,
      logo: produto.logo,
      aporteAnual: cotacao.premioAnualComIof,
      aporteAcumulado10a: brl(acumulado),
      custoSobreCapital: acumulado
        .dividedBy(capital)
        .times(100)
        .toDecimalPlaces(1, Decimal.ROUND_HALF_UP),
      breakevenDocumento: BREAKEVEN_DOCUMENTO,
      breakevenReal: resgate ? resgate.breakevenReal : null,
      resgate10a: resgate
        ? brl(resgate.resgate10aPor1mm.times(capital).dividedBy(CAPITAL_BASE))
        : new Decimal(0),
      fonteTarifa: cotacao.fonteTarifa,
    })
  }

  linhas.sort((a, b) => a.aporteAnual.comparedTo(b.aporteAnual))

  const valorPreservado =
    linhas.length > 1
      ? brl(linhas[linhas.length - 1].aporteAcumulado10a.minus(linhas[0].aporteAcumulado10a))
      : new Decimal(0)

  return { linhas, valorPreservado, indisponiveis }
}
