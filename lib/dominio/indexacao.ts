import Decimal from 'decimal.js'

/**
 * Correcao dos valores do estudo pelo IPCA.
 *
 * As tabelas das seguradoras trazem valor presente. O contrato, porem, corrige
 * premio, capital e reserva anualmente pela inflacao. Projetar esses numeros
 * responde "quanto vou pagar e receber em reais daquele ano" — e nada alem
 * disso: corrigir os dois lados pelo mesmo indice nao muda o ranking nem o
 * poder de compra, so troca a moeda em que tudo esta expresso.
 *
 * Sao dois fatores, e confundi-los custa caro. Um valor unico (o resgate, o
 * capital) cresce por (1+i)^n. Os dez aportes sao uma serie: cada um so comeca
 * a ser corrigido a partir do proprio aniversario, entao o acumulado cresce bem
 * menos. A 5% ao ano por dez anos, o valor unico multiplica por 1,63 e a serie
 * equivale a 12,58 aportes em vez de 10 — usar 1,63 no acumulado inflaria o
 * custo em 63% no lugar dos 26% reais.
 */

/**
 * Meta de inflacao do Banco Central. Serve de ponto de partida, nao de verdade:
 * a taxa e editavel na tela e a que foi usada vai impressa no documento.
 */
export const IPCA_PADRAO = new Decimal('0.045')

/** O padrao em pontos percentuais, como aparece e e digitado na tela ("4,5"). */
export const TAXA_INICIAL = IPCA_PADRAO.times(100).toString().replace('.', ',')

/** Faixa aceita. Acima disso nao e mais projecao, e especulacao. */
export const IPCA_MAXIMO = new Decimal('0.20')

/**
 * Horizonte da projecao: os dez anos de aporte, que e tambem o ano em que o
 * documento apresenta o resgate.
 */
export const ANOS_PROJECAO = 10

/** Valor futuro de um valor unico: (1+i)^n. */
export function fatorValorFuturo(taxa: Decimal, anos: number = ANOS_PROJECAO): Decimal {
  return taxa.plus(1).toPower(anos)
}

/**
 * Valor futuro de uma serie de `anos` aportes anuais: ((1+i)^n - 1) / i.
 *
 * Com taxa zero a formula divide por zero, e o limite e o proprio numero de
 * aportes — o caso aparece de verdade quando alguem zera a taxa para comparar
 * com o nominal.
 */
export function fatorSerieAportes(taxa: Decimal, anos: number = ANOS_PROJECAO): Decimal {
  if (taxa.isZero()) return new Decimal(anos)
  return fatorValorFuturo(taxa, anos).minus(1).dividedBy(taxa)
}

/**
 * Quanto o custo sobre o capital muda ao projetar.
 *
 * Numerador e denominador crescem em ritmos diferentes — o acumulado pela
 * serie, o capital pelo valor unico — entao o percentual nao fica igual: ele
 * cai. Como o fator so depende da taxa, a linha pode ser reescalada sem
 * precisar do capital de volta.
 */
export function fatorCustoSobreCapital(
  taxa: Decimal,
  anos: number = ANOS_PROJECAO,
): Decimal {
  return fatorSerieAportes(taxa, anos).dividedBy(fatorValorFuturo(taxa, anos).times(anos))
}

/** Le uma taxa vinda da interface, em pontos percentuais ("4,5" -> 0.045). */
export function taxaDePercentual(texto: string): Decimal | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return null
  let valor: Decimal
  try {
    valor = new Decimal(limpo)
  } catch {
    return null
  }
  if (!valor.isFinite() || valor.isNegative()) return null
  const taxa = valor.dividedBy(100)
  return taxa.greaterThan(IPCA_MAXIMO) ? null : taxa
}
