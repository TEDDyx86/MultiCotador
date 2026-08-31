/**
 * Gera o documento de metodologia em PDF a partir do Markdown do repositorio.
 *
 * Uma fonte de verdade so: `docs/METODOLOGIA-DE-CALCULO.md`. Revisar o
 * documento e rodar este script; nao ha texto para manter em dois lugares.
 *
 * Uso: npx tsx scripts/gerar-pdf-metodologia.ts [saida.pdf]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'
import { montarHtmlMetodologia, MARGEM_METODOLOGIA, RODAPE_METODOLOGIA } from '../lib/pdf/metodologia'
import { gerarPdf } from '../lib/pdf/navegador'

const ORIGEM = join(process.cwd(), 'docs/METODOLOGIA-DE-CALCULO.md')
const destino = process.argv[2] ?? 'Metodologia-de-Calculo-Multicotador.pdf'

const markdown = readFileSync(ORIGEM, 'utf8')

/*
 * O h1 e o bloco de metadados iniciais saem do corpo: a capa do template ja os
 * desenha, e repeti-los abriria o documento com o mesmo titulo duas vezes.
 * O corte e feito no primeiro `---`, que no arquivo separa o cabecalho do
 * conteudo — e nao por contagem de linhas, que quebraria na primeira edicao.
 */
const separador = markdown.indexOf('\n---\n')
if (separador === -1) {
  console.error(
    'Nao encontrei o separador "---" que fecha o cabecalho de ' +
      'docs/METODOLOGIA-DE-CALCULO.md. O corpo do PDF sairia com o titulo repetido.',
  )
  process.exit(1)
}

const cabecalho = markdown.slice(0, separador)
const corpoMarkdown = markdown.slice(separador + 5)

/*
 * A data de revisao e lida do proprio documento, e nao do relogio: um PDF
 * gerado hoje a partir de um texto revisado em maio deve dizer maio. Carimbar a
 * data da geracao faria o documento afirmar um frescor que ele nao tem.
 */
const revisao = cabecalho.match(/Última revisão deste documento \| ([^|\n]+)/)
const revisadoEm = revisao ? revisao[1].trim() : 'data não informada'

/*
 * A tabela de metadados do cabecalho volta ao corpo, agora marcada: ela e a
 * unica sem linha de cabecalho, e o CSS precisa distingui-la para nao desenhar
 * uma faixa navy vazia sobre ela.
 */
const tabelaMeta = cabecalho.slice(cabecalho.indexOf('| | |'))

const corpo =
  `<table class="meta">${
    marked
      .parse(tabelaMeta, { async: false })
      .replace(/^<table>/, '')
      .replace(/<\/table>\s*$/, '')
  }</table>` + marked.parse(corpoMarkdown, { async: false })

const html = montarHtmlMetodologia({ corpo, revisadoEm })

gerarPdf(html, { rodape: RODAPE_METODOLOGIA, margem: MARGEM_METODOLOGIA }).then((pdf) => {
  writeFileSync(destino, pdf)
  console.log(`${destino}: ${(pdf.byteLength / 1024).toFixed(0)} KB`)
  console.log(`revisão de ${revisadoEm}`)
})
