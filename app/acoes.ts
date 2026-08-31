'use server'

import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { multicotar } from '@/lib/motor/cotacao'
import { repositorioJson } from '@/lib/repositorio/repositorioJson'
import { projetarPorIpca } from '@/lib/motor/projecao'
import { IPCA_PADRAO, taxaDePercentual } from '@/lib/dominio/indexacao'
import { moeda, percentual } from '@/lib/formato'
import type { Modalidade, Sexo } from '@/lib/dominio/tipos'
import type { Comparativo } from '@/lib/motor/comparativo'

export interface Entrada {
  sexo: Sexo
  idade: number
  capital: string
  /**
   * Taxa anual de IPCA em pontos percentuais, como digitada ("4,5"). Ausente ou
   * invalida cai na meta do Banco Central.
   */
  taxaIpca?: string
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
  /**
   * Falso nos produtos que nao formam reserva resgatavel.
   *
   * Eles saem mais baratos que os demais por nao acumularem nada, e a lista
   * ordena por aporte: sem marcacao, os dois aparecem no topo como se fossem a
   * mesma coisa mais barata, e nao outro produto.
   */
  temResgate: boolean
}

/**
 * Um conjunto de produtos comparaveis entre si, nas duas moedas.
 *
 * As duas visoes chegam juntas, e nao em duas chamadas, para o corretor
 * alternar na frente do cliente sem espera — e sem que a tabela de tarifas
 * precise sair do servidor.
 */
export interface GrupoResultado {
  modalidade: Modalidade
  /** Visao nominal: os numeros que as seguradoras assinam. */
  comparativo: LinhaResultado[]
  valorPreservado: string
  /** A mesma tabela reexpressa em moeda futura pelo IPCA informado. */
  projetado: LinhaResultado[]
  valorPreservadoProjetado: string
}

export type Resultado =
  | {
      ok: true
      comResgate: GrupoResultado
      /**
       * Os produtos que nao formam reserva, para a aba ao lado. Nulo quando
       * nenhum deles cota nesta idade — o Legado da MetLife para aos 70 anos,
       * entao acima disso a aba nao tem o que mostrar.
       */
      semResgate: GrupoResultado | null
      /** A taxa efetivamente usada, ja formatada ("5,0%"). */
      taxaIpca: string
      todos: LinhaProduto[]
      indisponiveis: Array<{ produtoId: string; motivo: string }>
    }
  | { ok: false; erro: string }

/** Formata uma visao do comparativo para a tela. */
function paraTela(comp: Comparativo): LinhaResultado[] {
  const temResgate = comp.modalidade === 'com-resgate'
  return comp.linhas.map((l) => ({
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
    /*
     * Sem reserva o resgate e zero, e zero e menor que qualquer aporte. Sem
     * esta guarda a modalidade inteira acenderia o alerta de "o resgate nao
     * alcanca o aportado" — verdadeiro na aritmetica e sem sentido no produto,
     * que nunca prometeu resgate nenhum.
     */
    resgateAbaixoDoAportado: temResgate && l.resgate10a.lessThan(l.aporteAcumulado10a),
    estimada: l.fonteTarifa === 'ESTIMADO',
  }))
}

/** Monta as duas moedas de uma modalidade. Nulo quando nada cota nela. */
function montarGrupo(
  nominal: Comparativo,
  taxa: Decimal,
): GrupoResultado | null {
  if (nominal.linhas.length === 0) return null
  const projecao = projetarPorIpca(nominal, taxa)
  return {
    modalidade: nominal.modalidade,
    comparativo: paraTela(nominal),
    valorPreservado: moeda(nominal.valorPreservado),
    projetado: paraTela(projecao),
    valorPreservadoProjetado: moeda(projecao.valorPreservado),
  }
}

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

  /*
   * Um capital minusculo produz aporte que arredonda para R$ 0,00 -- com um
   * centavo de capital o comparativo anuncia um seguro de graca. E o resultado
   * aritmetico correto da tabela, e mesmo assim uma afirmacao falsa num
   * documento entregue ao cliente.
   *
   * O piso nao vem de regra de seguradora: o capital minimo de cada uma ainda
   * esta por confirmar (docs/PENDENCIAS.md). O corte e apenas onde a conta
   * perde sentido.
   */
  if (cotacoes.every((c) => c.premioAnual.lessThan(1))) {
    return {
      ok: false,
      erro:
        'Capital baixo demais para uma simulação com significado: o aporte fica ' +
        'abaixo de R$ 1,00 por ano. Cada seguradora ainda define o próprio ' +
        'capital mínimo de aceitação.',
    }
  }

  // Taxa invalida nao derruba a cotacao: cai no padrao e o documento imprime a
  // taxa que de fato foi usada, entao nao ha como sair numero sem procedencia.
  const taxa = (entrada.taxaIpca ? taxaDePercentual(entrada.taxaIpca) : null) ?? IPCA_PADRAO

  const comResgate = montarGrupo(
    montarComparativo(repo, entrada.sexo, entrada.idade, capital, 'com-resgate'),
    taxa,
  )
  const semResgate = montarGrupo(
    montarComparativo(repo, entrada.sexo, entrada.idade, capital, 'sem-resgate'),
    taxa,
  )

  /*
   * A aba principal vazia derruba a cotacao inteira. Chegar aqui exige que
   * `multicotar` tenha achado algum produto e nenhum deles forme reserva — hoje
   * so acontece acima de 75 anos, onde as quatro com resgate saem de faixa.
   */
  if (!comResgate) {
    return {
      ok: false,
      erro: `Nenhuma seguradora com formação de reserva cota aos ${entrada.idade} anos.`,
    }
  }

  return {
    ok: true,
    comResgate,
    semResgate,
    indisponiveis,
    taxaIpca: percentual(taxa.times(100)),
    todos: cotacoes.map((c) => ({
      produtoId: c.produto.id,
      seguradora: c.produto.seguradora,
      nome: c.produto.nome,
      logo: c.produto.logo,
      aporteAnual: moeda(c.premioAnualComIof),
      aporteMensal: moeda(c.premioMensalComIof),
      estimada: c.fonteTarifa === 'ESTIMADO',
      temResgate: c.produto.temResgate,
    })),
  }
}
