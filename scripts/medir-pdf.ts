/**
 * Mede a altura de cada bloco do documento contra a pagina A4.
 *
 * O estudo tem de caber numa unica folha. Quando o conteudo passa, o PDF nao
 * reclama: ele simplesmente cria uma segunda pagina, e o layout flex ainda pode
 * mascarar o problema comprimindo blocos. Esta medicao mostra onde esta o
 * excesso antes de sair cortando no escuro.
 *
 * Uso: npx tsx scripts/medir-pdf.ts
 */
import Decimal from 'decimal.js'
import { montarComparativo } from '../lib/motor/comparativo'
import { repositorioJson } from '../lib/repositorio/repositorioJson'
import { moeda, percentual } from '../lib/formato'
import { montarHtml } from '../lib/pdf/template'
import { abrirNavegador } from '../lib/pdf/navegador'

const ALTURA_A4_PT = 841.9

async function main() {
  const capital = new Decimal('1000000')
  const c = montarComparativo(repositorioJson, 'M', 50, capital)

  const html = montarHtml({
    nome: 'John Daniel',
    idade: 50,
    sexo: 'M',
    capitalFormatado: moeda(capital),
    estadoCivil: 'Casado(a)',
    regimeBens: 'Comunhão parcial de bens',
    profissao: 'Empresário',
    valorPreservado: moeda(c.valorPreservado),
    comparativo: c.linhas.map((l) => ({
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

  const navegador = await abrirNavegador()
  const pagina = await navegador.newPage()
  await pagina.setContent(html, { waitUntil: 'load' })
  await pagina.evaluateHandle('document.fonts.ready')

  // A funcao vai como string: o transpilador injeta helpers em funcoes passadas
  // por referencia, e eles nao existem no contexto da pagina.
  const medida = (await pagina.evaluate(`(() => {
    const paraPt = (v) => Math.round(v * 0.75 * 10) / 10;
    const blocos = {};
    const sels = ['.faixa-topo','h1','.chamada','.perfil','.cards','table',
                  '.preservado','.caracteristicas','.observacoes','.assinatura','.faixa-base'];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      blocos[sel] = paraPt(r.height + parseFloat(st.marginTop) + parseFloat(st.marginBottom));
    }
    return { total: paraPt(document.body.scrollHeight), blocos };
  })()`)) as { total: number; blocos: Record<string, number> }

  const excesso = Math.round((medida.total - ALTURA_A4_PT) * 10) / 10
  console.log(`conteudo: ${medida.total}pt   pagina A4: ${ALTURA_A4_PT}pt`)
  console.log(excesso > 0 ? `EXCESSO: ${excesso}pt (vai gerar 2 paginas)` : `folga: ${-excesso}pt`)
  console.log('\npor bloco (pt, com margens):')
  for (const [bloco, altura] of Object.entries(medida.blocos)) {
    console.log(`  ${bloco.padEnd(18)} ${String(altura).padStart(6)}`)
  }

  await navegador.close()
  process.exit(excesso > 0 ? 1 : 0)
}

main()
