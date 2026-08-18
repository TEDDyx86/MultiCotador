import type Decimal from 'decimal.js'

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/**
 * O Intl usa espaco nao-quebravel depois de "R$" (U+00A0), que impede o simbolo
 * de se separar do numero na quebra de linha. Normalizamos para espaco comum
 * porque os testes e a comparacao de strings ficam impossiveis de ler com ele.
 */
export function moeda(valor: Decimal): string {
  return MOEDA.format(valor.toNumber()).replace(/ /g, ' ')
}

/** Versao compacta, para titulos e cartoes onde o valor cheio nao cabe. */
export function moedaCurta(valor: Decimal): string {
  const numero = valor.toNumber()
  if (numero >= 1_000_000) {
    const milhoes = (numero / 1_000_000).toFixed(1).replace('.', ',')
    return `R$ ${milhoes} mi`
  }
  if (numero >= 1_000) {
    return `R$ ${Math.round(numero / 1_000)} mil`
  }
  return moeda(valor)
}

export function percentual(valor: Decimal): string {
  return `${valor.toFixed(1).replace('.', ',')}%`
}

export function dataExtenso(data: Date): string {
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`
}
