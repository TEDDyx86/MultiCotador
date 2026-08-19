/**
 * Verifica se a funcao do PDF leva para a Vercel tudo que ela precisa em runtime.
 *
 * Existe porque essa falha nao aparece localmente: em desenvolvimento o Puppeteer
 * usa o Chrome do sistema, e so no ambiente serverless ele procura o binario
 * empacotado. O sintoma la e um 500 generico, longe da causa.
 *
 * Uso: node scripts/verificar-bundle-pdf.mjs   (rodar depois de `npm run build`)
 * Sai com 1 quando algo obrigatorio ficou de fora.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const RASTREIO = '.next/server/app/api/comparativo/route.js.nft.json'

if (!existsSync(RASTREIO)) {
  console.error(`Rastreamento nao encontrado em ${RASTREIO}. Rode "npm run build" antes.`)
  process.exit(1)
}

const arquivos = JSON.parse(readFileSync(RASTREIO, 'utf8')).files ?? []

const OBRIGATORIOS = [
  // O Chromium comprimido: sem ele, executablePath() falha e a rota devolve 500.
  { rotulo: 'binario do Chromium', padrao: /@sparticuz[/\\]chromium[/\\]bin[/\\]chromium\.br$/ },
  // Camadas que o Chromium descomprime junto no ambiente Lambda.
  { rotulo: 'swiftshader (render por software)', padrao: /swiftshader\.tar\.br$/ },
  { rotulo: 'fontes do sistema', padrao: /fonts\.tar\.br$/ },
  // Ativos que o template le do disco.
  { rotulo: 'fonte TeX Gyre Heros regular', padrao: /texgyreheros-regular\.otf$/ },
  { rotulo: 'fonte TeX Gyre Heros bold', padrao: /texgyreheros-bold\.otf$/ },
  { rotulo: 'fonte DejaVu Serif Italic', padrao: /DejaVuSerif-Italic\.ttf$/ },
  { rotulo: 'logo Blue3', padrao: /blue3-transparente\.png$/ },
  { rotulo: 'logo Robson Tavernard', padrao: /rt-horizontal-branca\.png$/ },
]

let faltando = 0
console.log(`arquivos rastreados pela rota: ${arquivos.length}\n`)
for (const { rotulo, padrao } of OBRIGATORIOS) {
  const achou = arquivos.some((a) => padrao.test(a))
  console.log(`  ${achou ? 'ok   ' : 'FALTA'}  ${rotulo}`)
  if (!achou) faltando++
}

if (faltando) {
  console.error(
    `\n${faltando} item(ns) fora do bundle. Na Vercel isso vira 500 na geracao do PDF.\n` +
      `Acrescente o caminho em outputFileTracingIncludes["/api/comparativo"] no next.config.ts.`,
  )
  process.exit(1)
}
console.log('\nTudo que a rota le em runtime esta no bundle.')
