import Decimal from 'decimal.js'
import { CAPITAL_BASE, aplicarIof, brl } from '@/lib/dominio/regras'
import type { Cotacao, Sexo } from '@/lib/dominio/tipos'
import type { Repositorio } from '@/lib/repositorio/repositorio'

export class TarifaIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'TarifaIndisponivel'
  }
}

function formatarBrl(valor: Decimal): string {
  return valor.toNumber().toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function cotar(
  repo: Repositorio,
  produtoId: string,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): Cotacao {
  if (capital.lessThanOrEqualTo(0)) {
    throw new TarifaIndisponivel('O capital segurado deve ser positivo.')
  }

  const produto = repo.produto(produtoId)
  if (!produto) {
    throw new TarifaIndisponivel(`Produto desconhecido: ${produtoId}`)
  }

  const tarifa = repo.tarifa(produtoId, sexo, idade)
  if (!tarifa) {
    throw new TarifaIndisponivel(
      `${produto.nome} não está disponível aos ${idade} anos ` +
        `(faixa de ${produto.idadeMin} a ${produto.idadeMax}).`,
    )
  }

  if (tarifa.capitalMax && capital.greaterThan(tarifa.capitalMax)) {
    throw new TarifaIndisponivel(
      `${produto.nome} aceita no máximo ${formatarBrl(tarifa.capitalMax)} ` +
        `de capital aos ${idade} anos.`,
    )
  }

  // O premio escala linearmente com o capital, sem taxa fixa de apolice.
  const anual = tarifa.taxaAnualPor1mm.times(capital).dividedBy(CAPITAL_BASE)
  const anualComIof = aplicarIof(anual)

  // Arredondar so na saida: arredondar antes propagaria erro para o mensal.
  return {
    produto,
    sexo,
    idade,
    capital: brl(capital),
    premioAnual: brl(anual),
    premioAnualComIof: brl(anualComIof),
    premioMensal: brl(anual.dividedBy(12)),
    premioMensalComIof: brl(anualComIof.dividedBy(12)),
    fonteTarifa: tarifa.fonte,
  }
}

/** Cota todos os produtos elegiveis, do mais barato ao mais caro. */
export function multicotar(
  repo: Repositorio,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): { cotacoes: Cotacao[]; indisponiveis: Array<{ produtoId: string; motivo: string }> } {
  const cotacoes: Cotacao[] = []
  const indisponiveis: Array<{ produtoId: string; motivo: string }> = []

  for (const produto of repo.produtos()) {
    try {
      cotacoes.push(cotar(repo, produto.id, sexo, idade, capital))
    } catch (erro) {
      if (erro instanceof TarifaIndisponivel) {
        indisponiveis.push({ produtoId: produto.id, motivo: erro.message })
      } else {
        throw erro
      }
    }
  }

  cotacoes.sort((a, b) => a.premioAnualComIof.comparedTo(b.premioAnualComIof))
  return { cotacoes, indisponiveis }
}
