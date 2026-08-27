import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Logos e fontes entram no HTML como data URI.
 *
 * O Puppeteer recebe a pagina por setContent, entao ela nao tem origem: um
 * caminho relativo ou file:// nao resolveria. Embutir tambem elimina a corrida
 * entre a captura do PDF e o download dos arquivos — a pagina ja nasce completa.
 *
 * Cada readFileSync recebe o caminho escrito ali mesmo, e nao uma variavel.
 * Parece repetitivo, e e de proposito: com caminho dinamico o bundler nao sabe o
 * que sera lido e passa a rastrear o projeto inteiro para dentro da funcao
 * serverless, inflando o deploy.
 *
 * O cache evita reler os ~750 KB a cada chamada; a funcao reaproveita o modulo
 * entre invocacoes.
 */

const RAIZ = process.cwd()
const cache = new Map<string, string>()

function comoDataUri(chave: string, mime: string, bytes: Buffer): string {
  let valor = cache.get(chave)
  if (valor === undefined) {
    valor = `data:${mime};base64,${bytes.toString('base64')}`
    cache.set(chave, valor)
  }
  return valor
}

/**
 * Versao negativa oficial, recortada na marca util: 1809x347.
 *
 * A anterior tinha 173x34 e era impressa com 28pt de altura, quase tres vezes o
 * proprio tamanho — dai a pixelacao no cabecalho. Esta cobre a mesma altura com
 * sobra, e ja vem com fundo transparente, entao assenta sobre o gradiente da
 * faixa sem o retangulo navy que o arquivo original trazia embutido.
 */
export function logoBlue3(): string {
  return comoDataUri(
    'blue3',
    'image/png',
    readFileSync(join(RAIZ, 'public/marcas/blue3-negativa.png')),
  )
}

/**
 * Versao navy, para o papel branco do documento.
 *
 * Antes usava a logo branca da tela com `filter:brightness(0)`, que a jogava
 * para preto puro. O modelo assina em navy (#232840); a arte oficial e #21253E,
 * a mesma tinta. Com o arquivo certo o hack sai e a cor bate.
 */
export function logoRt(): string {
  return comoDataUri(
    'rt',
    'image/png',
    readFileSync(join(RAIZ, 'public/marcas/rt-horizontal-navy.png')),
  )
}

/**
 * As fontes que o estudo original usa, para o layout nao escorregar.
 *
 * Em TrueType, e nao no OTF original. O Chrome nao consegue embutir contornos
 * CFF direto: ele converte a fonte em Type3, um formato de glifos procedurais.
 * O documento continuava legivel, mas com metricas proprias — negrito e regular
 * assentavam em alturas diferentes na mesma linha da tabela — e sem a fonte
 * CID que o modelo usa. Convertidas para contornos quadraticos, o Chrome as
 * embute como Type0, igual ao modelo.
 */
export function fonteRegular(): string {
  return comoDataUri(
    'heros',
    'font/ttf',
    readFileSync(join(RAIZ, 'public/fontes/texgyreheros-regular.ttf')),
  )
}

export function fonteNegrito(): string {
  return comoDataUri(
    'heros-bold',
    'font/ttf',
    readFileSync(join(RAIZ, 'public/fontes/texgyreheros-bold.ttf')),
  )
}

export function fonteSerifItalica(): string {
  return comoDataUri(
    'dejavu-italic',
    'font/ttf',
    readFileSync(join(RAIZ, 'public/fontes/DejaVuSerif-Italic.ttf')),
  )
}
