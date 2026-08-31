import type Decimal from 'decimal.js'

export type Sexo = 'M' | 'F'
export type FonteTarifa = 'PDF' | 'XLSX' | 'ESTIMADO'

export interface Produto {
  id: string
  seguradoraId: string
  seguradora: string
  nome: string
  codigoSusep: string | null
  logo: string
  anosPagamento: number
  idadeMin: number
  idadeMax: number
  temResgate: boolean
  premioJaComIof: boolean
  entraNoComparativo: boolean
}

export interface Tarifa {
  produtoId: string
  sexo: Sexo
  idade: number
  /** Premio anual LIQUIDO (sem IOF) para R$ 1.000.000 de capital. */
  taxaAnualPor1mm: Decimal
  /** Teto de capital nesta idade. Nulo quando nao ha limite. */
  capitalMax: Decimal | null
  fonte: FonteTarifa
}

export interface Resgate {
  produtoId: string
  sexo: Sexo
  idadeEntrada: number
  /** Primeiro ano em que o resgate alcanca o aportado. Nulo = nunca alcanca. */
  breakevenReal: number | null
  resgate10aPor1mm: Decimal
}

export interface Cotacao {
  produto: Produto
  sexo: Sexo
  idade: number
  capital: Decimal
  premioAnual: Decimal
  premioAnualComIof: Decimal
  premioMensal: Decimal
  premioMensalComIof: Decimal
  fonteTarifa: FonteTarifa
}

export interface DadosCliente {
  nome: string
  sexo: Sexo
  dataNascimento: Date
}

/**
 * Dados do cliente que viajam do formulario ate o documento.
 *
 * O nome nao afeta o calculo — e identificacao impressa no comparativo. Estado
 * civil, regime de bens e profissao viviam aqui pelo mesmo motivo e foram
 * retirados: nao entravam em conta nenhuma e ocupavam uma linha do documento,
 * que precisa caber em uma unica pagina A4.
 */
export interface DadosFormulario {
  nome: string
  sexo: Sexo
  idade: number
  /** Capital em formato decimal, ex.: "1000000.00". */
  capital: string
  /** Taxa anual de IPCA em pontos percentuais, como digitada ("4,5"). */
  taxaIpca: string
}

/**
 * Em que moeda o estudo esta expresso.
 *
 * `nominal` sao os numeros que as seguradoras assinam. `ipca` reexpressa os
 * mesmos numeros na moeda do ano em que serao pagos e recebidos — o que nao
 * muda o poder de compra nem o ranking, so a unidade.
 */
export type Visao = 'nominal' | 'ipca'

/**
 * Qual familia de produto o comparativo esta cotando.
 *
 * Sao dois mercados, nao duas colunas do mesmo: `sem-resgate` nao forma reserva
 * e por isso sai bem mais barato. Compara-los na mesma tabela leva direto a
 * conclusao errada — o mais barato ganha, e ele nao devolve nada em vida. Por
 * isso o comparativo troca de conjunto inteiro em vez de somar colunas.
 */
export type Modalidade = 'com-resgate' | 'sem-resgate'
