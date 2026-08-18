'use server'

import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { multicotar } from '@/lib/motor/cotacao'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'
import { moeda, percentual } from '@/lib/formato'
import type { Sexo } from '@/lib/dominio/tipos'

export interface Entrada {
  sexo: Sexo
  idade: number
  capital: string
}

/** Tudo ja formatado: o cliente nao recebe Decimal nem a tabela de tarifas. */
export interface LinhaResultado {
  produtoId: string
  seguradora: string
  logo: string
  aporteAnual: string
  aporteMensal: string
  aporteAcumulado10a: string
  custoSobreCapital: string
  breakevenDocumento: number
  breakevenReal: number | null
  resgate10a: string
  /** Verdadeiro quando o resgate no 10o ano nao alcanca o aportado. */
  resgateAbaixoDoAportado: boolean
  estimada: boolean
}

export interface LinhaProduto {
  produtoId: string
  seguradora: string
  nome: string
  logo: string
  aporteAnual: string
  aporteMensal: string
  estimada: boolean
}

export type Resultado =
  | {
      ok: true
      comparativo: LinhaResultado[]
      todos: LinhaProduto[]
      indisponiveis: Array<{ produtoId: string; motivo: string }>
      valorPreservado: string
    }
  | { ok: false; erro: string }

export async function cotarComparativo(entrada: Entrada): Promise<Resultado> {
  let capital: Decimal
  try {
    capital = new Decimal(entrada.capital)
  } catch {
    return { ok: false, erro: 'Informe um capital segurado valido.' }
  }
  if (!capital.isFinite() || capital.lessThanOrEqualTo(0)) {
    return { ok: false, erro: 'O capital segurado deve ser maior que zero.' }
  }
  if (!Number.isInteger(entrada.idade)) {
    return { ok: false, erro: 'Idade invalida.' }
  }

  const repo = repositorioJson
  const { cotacoes, indisponiveis } = multicotar(repo, entrada.sexo, entrada.idade, capital)

  if (cotacoes.length === 0) {
    return {
      ok: false,
      erro: `Nenhuma seguradora cota aos ${entrada.idade} anos com esse capital.`,
    }
  }

  const comp = montarComparativo(repo, entrada.sexo, entrada.idade, capital)

  return {
    ok: true,
    valorPreservado: moeda(comp.valorPreservado),
    indisponiveis,
    comparativo: comp.linhas.map((l) => ({
      produtoId: l.produtoId,
      seguradora: l.seguradora,
      logo: l.logo,
      aporteAnual: moeda(l.aporteAnual),
      aporteMensal: moeda(l.aporteAnual.dividedBy(12)),
      aporteAcumulado10a: moeda(l.aporteAcumulado10a),
      custoSobreCapital: percentual(l.custoSobreCapital),
      breakevenDocumento: l.breakevenDocumento,
      breakevenReal: l.breakevenReal,
      resgate10a: moeda(l.resgate10a),
      resgateAbaixoDoAportado: l.resgate10a.lessThan(l.aporteAcumulado10a),
      estimada: l.fonteTarifa === 'ESTIMADO',
    })),
    todos: cotacoes.map((c) => ({
      produtoId: c.produto.id,
      seguradora: c.produto.seguradora,
      nome: c.produto.nome,
      logo: c.produto.logo,
      aporteAnual: moeda(c.premioAnualComIof),
      aporteMensal: moeda(c.premioMensalComIof),
      estimada: c.fonteTarifa === 'ESTIMADO',
    })),
  }
}
