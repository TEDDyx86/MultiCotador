/**
 * Mede a altura de cada bloco do documento contra o espaco util da pagina.
 *
 * O estudo tem de caber numa unica folha. Como o body tem altura fixa de uma A4
 * e `overflow:hidden`, o excesso nao vira uma segunda pagina: ele e **cortado em
 * silencio**. O rodape continua no lugar e o que sobrou some sem aviso, que e
 * pior do que uma folha extra — ninguem percebe olhando o PDF.
 *
 * Por isso a medicao compara o conteudo de `.corpo` com a altura que `.corpo`
 * realmente tem, e nao a altura do body contra os 841,9pt da folha: o body tem
 * altura fixa, entao aquela conta media sempre a mesma coisa e ainda acusava
 * 0,4pt de excesso inexistente, so por causa do arredondamento do viewport
 * (1123px = 842,25pt contra 841,89pt de A4).
 *
 * Uso: npx tsx scripts/medir-pdf.ts ["Nome"] [capital] [nominal|ipca] [modalidade]
 *
 * Nome e capital entram por argumento porque sao as duas entradas capazes de
 * mudar a altura: um nome longo empurra a chamada para uma segunda linha, e um
 * capital muito alto pode fazer um valor quebrar dentro da celula da tabela.
 */
import Decimal from 'decimal.js'
import { montarComparativo } from '../lib/motor/comparativo'
import { projetarPorIpca } from '../lib/motor/projecao'
import { IPCA_PADRAO } from '../lib/dominio/indexacao'
import { repositorioJson } from '../lib/repositorio/repositorioJson'
import { moeda, percentual } from '../lib/formato'
import { montarHtml } from '../lib/pdf/template'
import { abrirNavegador } from '../lib/pdf/navegador'

const ALTURA_A4_PT = 841.9

async function main() {
  const capital = new Decimal(process.argv[3] ?? '1000000')
  const projetada = process.argv[4] === 'ipca'
  const modalidade = process.argv[5] === 'sem-resgate' ? 'sem-resgate' : 'com-resgate'
  const nominal = montarComparativo(repositorioJson, 'M', 50, capital, modalidade)
  const c = projetada ? projetarPorIpca(nominal, IPCA_PADRAO) : nominal

  const html = montarHtml({
    nome: process.argv[2] ?? 'John Daniel',
    idade: 50,
    sexo: 'M',
    capitalFormatado: moeda(capital),
    valorPreservado: moeda(c.valorPreservado),
    projetada,
    modalidade,
    taxaIpca: percentual(IPCA_PADRAO.times(100)),
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
    const corpo = document.querySelector('.corpo');
    /*
     * A base do ultimo bloco, e nao o scrollHeight: o corpo e flex:1 e estica
     * ate o rodape, entao seu scrollHeight nunca fica abaixo do clientHeight e a
     * folga real apareceria sempre como zero.
     */
    const base = corpo.lastElementChild.getBoundingClientRect().bottom;
    return {
      conteudo: paraPt(base - corpo.getBoundingClientRect().top),
      disponivel: paraPt(corpo.clientHeight),
      blocos,
    };
  })()`)) as { conteudo: number; disponivel: number; blocos: Record<string, number> }

  const excesso = Math.round((medida.conteudo - medida.disponivel) * 10) / 10
  console.log(`pagina A4: ${ALTURA_A4_PT}pt`)
  console.log(`corpo: ${medida.conteudo}pt de conteudo em ${medida.disponivel}pt uteis`)
  console.log(
    excesso > 0
      ? `EXCESSO: ${excesso}pt — o final do documento sai cortado`
      : `folga: ${-excesso}pt`,
  )
  console.log('\npor bloco (pt, com margens):')
  for (const [bloco, altura] of Object.entries(medida.blocos)) {
    console.log(`  ${bloco.padEnd(18)} ${String(altura).padStart(6)}`)
  }

  await navegador.close()
  process.exit(excesso > 0 ? 1 : 0)
}

main()
