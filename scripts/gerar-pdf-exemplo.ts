/**
 * Gera o comparativo em PDF sem subir a aplicacao.
 *
 * Serve para conferir o layout contra Comparativo-WholeLife-JohnDaniel.pdf sem
 * precisar de sessao nem de navegador aberto.
 *
 * Uso: npx tsx scripts/gerar-pdf-exemplo.ts [saida.pdf] [nome] [ipca] [sem-resgate]
 */
import { writeFileSync } from 'node:fs'
import Decimal from 'decimal.js'
import { montarComparativo } from '../lib/motor/comparativo'
import { projetarPorIpca } from '../lib/motor/projecao'
import { IPCA_PADRAO } from '../lib/dominio/indexacao'
import { repositorioJson } from '../lib/repositorio/repositorioJson'
import { moeda, percentual } from '../lib/formato'
import { montarHtml } from '../lib/pdf/template'
import { gerarPdf } from '../lib/pdf/navegador'

const destino = process.argv[2] ?? 'comparativo-exemplo.pdf'

// Mesmo perfil do estudo de referencia, para permitir comparacao lado a lado.
const capital = new Decimal('1000000')
const projetada = process.argv[4] === 'ipca'
const modalidade = process.argv[5] === 'sem-resgate' ? 'sem-resgate' : 'com-resgate'
const nominal = montarComparativo(repositorioJson, 'M', 50, capital, modalidade)
const comparativo = projetada ? projetarPorIpca(nominal, IPCA_PADRAO) : nominal

const html = montarHtml({
  nome: process.argv[3] ?? 'John Daniel',
  idade: 50,
  sexo: 'M',
  capitalFormatado: moeda(capital),
  valorPreservado: moeda(comparativo.valorPreservado),
  projetada,
  modalidade,
  taxaIpca: percentual(IPCA_PADRAO.times(100)),
  comparativo: comparativo.linhas.map((l) => ({
    produtoId: l.produtoId,
    seguradora: l.seguradora,
    logo: l.logo,
    aporteAnual: moeda(l.aporteAnual),
    aporteMensal: moeda(l.aporteAnual.dividedBy(12)),
    aporteAcumulado10a: moeda(l.aporteAcumulado10a),
    custoSobreCapital: percentual(l.custoSobreCapital),
    breakevenDocumento: l.breakevenDocumento,
    breakevenReal: l.breakevenReal,
    resgate10a: moeda(l.resgate10a),
    resgateAbaixoDoAportado: l.resgate10a.lessThan(l.aporteAcumulado10a),
    estimada: l.fonteTarifa === 'ESTIMADO',
  })),
})

gerarPdf(html).then((pdf) => {
  writeFileSync(destino, pdf)
  console.log(`${destino}: ${(pdf.byteLength / 1024).toFixed(0)} KB`)
  for (const l of comparativo.linhas) {
    console.log(`  ${l.seguradora.padEnd(11)} ${moeda(l.aporteAnual)}`)
  }
})
