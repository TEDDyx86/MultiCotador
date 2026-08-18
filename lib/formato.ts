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

/** Converte o texto exibido no campo para um numero em formato decimal. */
export function moedaParaNumero(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  if (digitos === '') return ''
  const centavos = digitos.padStart(3, '0')
  const inteiros = centavos.slice(0, -2).replace(/^0+(?=\d)/, '')
  return `${inteiros}.${centavos.slice(-2)}`
}

/**
 * Monta a mascara a partir dos digitos crus. O usuario digita apenas numeros e
 * os centavos se formam da direita para a esquerda, como numa calculadora —
 * evita ter que posicionar cursor no meio de pontuacao.
 */
export function numeroParaMascara(digitos: string): string {
  const limpos = digitos.replace(/\D/g, '')
  if (limpos === '') return ''
  const centavos = limpos.padStart(3, '0')
  const inteiros = centavos.slice(0, -2).replace(/^0+(?=\d)/, '')
  const comMilhar = inteiros.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${comMilhar},${centavos.slice(-2)}`
}

/** Aplica mascara de data DD/MM/AAAA a medida que o usuario digita */
export function mascaraData(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`
}

/** Converte string DD/MM/AAAA para objeto Date caso seja valida */
export function dataBrasileiraParaDate(texto: string): Date | null {
  const digitos = texto.replace(/\D/g, '')
  if (digitos.length !== 8) return null

  const dia = parseInt(digitos.slice(0, 2), 10)
  const mes = parseInt(digitos.slice(2, 4), 10)
  const ano = parseInt(digitos.slice(4, 8), 10)

  if (ano < 1900 || ano > new Date().getFullYear()) return null
  if (mes < 1 || mes > 12) return null

  const data = new Date(ano, mes - 1, dia)
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return null
  }

  // Nao pode ser data futura
  if (data > new Date()) return null

  return data
}
