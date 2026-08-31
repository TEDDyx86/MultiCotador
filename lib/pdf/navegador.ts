import type { Browser } from 'puppeteer-core'
import puppeteer from 'puppeteer-core'

/**
 * Abre o Chromium certo para cada ambiente.
 *
 * Na Vercel o Puppeteer completo nao cabe: o Chromium sozinho estoura o limite
 * de 250 MB da funcao serverless. Por isso @sparticuz/chromium, que traz um
 * binario comprimido (~50 MB) preparado para esse ambiente.
 *
 * Em desenvolvimento nao faz sentido pagar esse custo — usa o Chrome ja
 * instalado na maquina.
 */

const CAMINHOS_LOCAIS = [
  process.env.CHROME_EXECUTAVEL,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((c): c is string => Boolean(c))

function ehServerless(): boolean {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL)
}

async function chromeLocal(): Promise<string> {
  const { existsSync } = await import('node:fs')
  const encontrado = CAMINHOS_LOCAIS.find((caminho) => existsSync(caminho))
  if (!encontrado) {
    throw new Error(
      'Chrome nao encontrado para gerar o PDF em desenvolvimento. ' +
        'Instale o Chrome ou aponte CHROME_EXECUTAVEL para o executavel.',
    )
  }
  return encontrado
}

export async function abrirNavegador(): Promise<Browser> {
  if (ehServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      // A v149 nao expoe mais defaultViewport. Como o tamanho da pagina vem do
      // @page do CSS, a viewport aqui e so o palco da renderizacao: A4 em px
      // a 96dpi, para o layout nao ser medido numa janela estreita.
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  return puppeteer.launch({
    executablePath: await chromeLocal(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
}

/**
 * Rodape repetido em toda pagina, para documentos de mais de uma folha.
 *
 * O Chrome nao herda o CSS da pagina neste template: fonte e tamanho precisam
 * vir inline, ou o texto sai no corpo 8px padrao, ilegivel no papel.
 */
export interface OpcoesPdf {
  /** HTML do rodape repetido. Aceita as classes `pageNumber` e `totalPages`. */
  rodape?: string
  /** Margens da folha. O comparativo de uma pagina desenha as suas no proprio CSS. */
  margem?: { top: string; right: string; bottom: string; left: string }
}

const SEM_MARGEM = { top: '0', right: '0', bottom: '0', left: '0' }

/** Renderiza o HTML numa pagina A4 e devolve os bytes do PDF. */
export async function gerarPdf(html: string, opcoes: OpcoesPdf = {}): Promise<Uint8Array> {
  const navegador = await abrirNavegador()
  try {
    const pagina = await navegador.newPage()
    // networkidle0 nao serve aqui: a pagina nao busca nada da rede, tudo vem
    // embutido como data URI. Esperar por rede ociosa so somaria latencia.
    await pagina.setContent(html, { waitUntil: 'load' })
    // As fontes sao @font-face em base64; sem isso o PDF pode sair com a
    // fonte de fallback, e o layout inteiro escorrega.
    await pagina.evaluateHandle('document.fonts.ready')
    return await pagina.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: opcoes.margem ?? SEM_MARGEM,
      ...(opcoes.rodape
        ? {
            displayHeaderFooter: true,
            // Cabecalho vazio, e nao ausente: sem ele o Chrome imprime o titulo
            // e a URL da pagina no topo de toda folha.
            headerTemplate: '<span></span>',
            footerTemplate: opcoes.rodape,
          }
        : {}),
    })
  } finally {
    await navegador.close()
  }
}
