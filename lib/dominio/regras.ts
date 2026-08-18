import Decimal from 'decimal.js'

/** Aliquota de IOF sobre premio de seguro de pessoas. */
export const IOF = new Decimal('0.0038')

/** Capital de referencia das tabelas de tarifa. */
export const CAPITAL_BASE = new Decimal('1000000')

/** Ano em que o comparativo apresenta o break-even, por decisao de negocio. */
export const BREAKEVEN_DOCUMENTO = 10

/** Arredonda para centavos, meio para cima — como faz o mercado financeiro. */
export function brl(valor: Decimal): Decimal {
  return valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

export function aplicarIof(premioLiquido: Decimal): Decimal {
  return premioLiquido.times(IOF.plus(1))
}

/** Anos completos entre as duas datas. */
export function idadeEm(nascimento: Date, referencia: Date): number {
  let anos = referencia.getFullYear() - nascimento.getFullYear()
  const mes = referencia.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) {
    anos -= 1
  }
  return anos
}
