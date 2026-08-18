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
  estadoCivil: string
  regimeBens: string | null
  profissao: string
}
