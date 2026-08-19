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
 * Versao sem o fundo navy solido: o cabecalho do estudo tem gradiente, e o
 * retangulo embutido no arquivo original apareceria recortado sobre ele.
 */
export function logoBlue3(): string {
  return comoDataUri(
    'blue3',
    'image/png',
    readFileSync(join(RAIZ, 'public/marcas/blue3-transparente.png')),
  )
}

export function logoRt(): string {
  return comoDataUri(
    'rt',
    'image/png',
    readFileSync(join(RAIZ, 'public/marcas/rt-horizontal-branca.png')),
  )
}

/** As fontes que o estudo original usa, para o layout nao escorregar. */
export function fonteRegular(): string {
  return comoDataUri(
    'heros',
    'font/otf',
    readFileSync(join(RAIZ, 'public/fontes/texgyreheros-regular.otf')),
  )
}

export function fonteNegrito(): string {
  return comoDataUri(
    'heros-bold',
    'font/otf',
    readFileSync(join(RAIZ, 'public/fontes/texgyreheros-bold.otf')),
  )
}

export function fonteSerifItalica(): string {
  return comoDataUri(
    'dejavu-italic',
    'font/ttf',
    readFileSync(join(RAIZ, 'public/fontes/DejaVuSerif-Italic.ttf')),
  )
}
