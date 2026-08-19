import { fonteNegrito, fonteRegular, fonteSerifItalica, logoBlue3, logoRt } from './ativos'
import type { LinhaResultado } from '@/app/acoes'

/**
 * Reproduz o layout do estudo Comparativo-WholeLife.
 *
 * As cores e as medidas nao foram estimadas por foto: saem do proprio PDF de
 * referencia (pdfplumber sobre os retangulos da pagina). Dai o uso de `pt` em
 * vez de `px` — a pagina A4 tem 595,3 x 841,9 pt e as margens do modelo caem
 * em 39,7pt, o que em px daria numero quebrado.
 */

const NAVY = '#002060'
const AZUL = '#0092FF'
const AZUL_CLARO = '#E6F2FF'
const CINZA_BORDA = '#E5E5E5'
const CINZA_FUNDO = '#FAFAFA'
const CINZA_FAIXA = '#F1F1F1'
const CINZA_BARRA = '#666666'
const TINTA = '#111111'
const TINTA_SUAVE = '#555555'

export interface DadosDocumento {
  nome: string
  idade: number
  sexo: 'M' | 'F'
  capitalFormatado: string
  estadoCivil?: string
  regimeBens?: string | null
  profissao?: string
  comparativo: LinhaResultado[]
  valorPreservado: string
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Diferenca da seguradora para a recomendada, como no modelo: "+ R$ x (+y%)". */
function diferenca(linha: LinhaResultado, referencia: LinhaResultado): string {
  const valor = (texto: string) => Number(texto.replace(/\D/g, '')) / 100
  const a = valor(linha.aporteAnual)
  const b = valor(referencia.aporteAnual)
  if (b === 0) return ''
  const delta = a - b
  const pct = (delta / b) * 100
  const reais = delta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `+ R$ ${reais} (+${pct.toFixed(1).replace('.', ',')}%)`
}

const CARACTERISTICAS = [
  [
    'Vigência vitalícia com aporte em 10 anos',
    'Aporte concentrado em período determinado, com cobertura que se estende por toda a vida do segurado.',
  ],
  [
    'Reajuste apenas pela inflação',
    'Correção anual limitada ao IPCA, sem reenquadramento etário ao longo do contrato.',
  ],
  [
    'Underwriting e congelamento do risco',
    'Análise prévia de saúde na contratação e preservação das condições contratuais ao longo da vigência.',
  ],
  [
    'Direito de resgate',
    'Formação de reserva resgatável a partir do 25º mês, oferecendo liquidez financeira ao segurado em vida.',
  ],
]

export function montarHtml(dados: DadosDocumento): string {
  const { comparativo: linhas } = dados
  const recomendada = linhas[0]
  const perfil = `${dados.sexo === 'M' ? 'Masculino' : 'Feminino'}, ${dados.idade} anos`

  const complemento = [dados.estadoCivil, dados.regimeBens, dados.profissao]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(' • ')

  const cabecalhoTabela = linhas
    .map((l, i) =>
      i === 0
        ? `<th class="col-rec"><span class="rec-tag">Recomendada</span><br>${escapar(l.seguradora)}</th>`
        : `<th>${escapar(l.seguradora)}</th>`,
    )
    .join('')

  const linhaTabela = (titulo: string, valores: string[]) =>
    `<tr><th scope="row">${titulo}</th>${valores
      .map((v, i) => `<td class="${i === 0 ? 'destaque' : ''}">${v}</td>`)
      .join('')}</tr>`

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @font-face { font-family:'Heros'; font-weight:400; src:url('${fonteRegular()}') format('opentype'); }
  @font-face { font-family:'Heros'; font-weight:700; src:url('${fonteNegrito()}') format('opentype'); }
  @font-face { font-family:'SerifIt'; font-style:italic; src:url('${fonteSerifItalica()}') format('truetype'); }

  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  /* Altura fixa de uma pagina A4 e coluna flex: o rodape encosta na base e o
     conteudo nao empurra nada para uma segunda folha. O estudo e de 1 pagina. */
  body { font-family:'Heros',Arial,sans-serif; color:${TINTA}; font-size:7.5pt;
         width:595.3pt; height:841.9pt; display:flex; flex-direction:column;
         overflow:hidden;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .faixa-topo { height:59.5pt; flex-shrink:0; background:linear-gradient(100deg,${NAVY} 0%,#0A3A8F 100%);
                display:flex; align-items:center; justify-content:space-between;
                padding:0 39.7pt; }
  .faixa-topo img { height:26pt; }
  .faixa-topo .tag { color:#7FC4FF; font-size:7.5pt; font-weight:700; letter-spacing:.9pt;
                     text-align:right; line-height:1.5; text-transform:uppercase; }

  .corpo { padding:0 39.7pt; flex:1; }

  h1 { color:${NAVY}; font-size:18pt; font-weight:700; letter-spacing:-.2pt; margin-top:10pt; }
  .chamada { font-size:8.5pt; color:${TINTA_SUAVE}; margin-top:5pt; }
  .chamada b { color:${TINTA}; }

  .perfil { margin-top:9pt; background:${CINZA_FAIXA}; border-left:2.2pt solid ${AZUL};
            height:37.9pt; flex-shrink:0; display:flex; align-items:center; }
  .perfil div { padding:0 12pt; }
  .perfil dt { font-size:7pt; font-weight:700; color:#8A8A8A; letter-spacing:.55pt;
               text-transform:uppercase; }
  .perfil dd { font-size:8.5pt; font-weight:700; color:${NAVY}; margin-top:2.5pt; }

  h2 { color:${NAVY}; font-size:9.5pt; font-weight:700; letter-spacing:.35pt;
       text-transform:uppercase; margin-top:9pt; padding-bottom:3pt; }
  .regua { height:1pt; background:${CINZA_BORDA}; position:relative; margin-bottom:9pt; }
  .regua::before { content:''; position:absolute; left:0; top:0; width:78pt; height:1pt;
                   background:${AZUL}; }

  .cards { display:flex; gap:7pt; }
  .card { flex:1; border:.8pt solid ${CINZA_BORDA}; border-radius:3pt; padding:7pt 6pt;
          text-align:center; }
  .card.rec { border:1.2pt solid ${AZUL}; background:${AZUL_CLARO}; }
  .card .pos { font-size:7pt; font-weight:700; color:#9A9A9A; letter-spacing:.5pt;
               text-transform:uppercase; }
  .card.rec .pos { color:${AZUL}; }
  .card .marca { font-size:11pt; font-weight:700; color:${NAVY}; margin-top:5pt; }
  .card .valor { font-size:9.5pt; font-weight:700; color:${TINTA}; margin-top:6pt; }
  .card .delta { font-size:7pt; color:${TINTA_SUAVE}; margin-top:4pt; }
  .card.rec .delta { color:${AZUL}; font-weight:700; }

  table { width:100%; border-collapse:collapse; font-size:8.5pt; }
  thead th { background:#FFFFFF; border-bottom:.8pt solid ${CINZA_BORDA}; padding:6pt 5pt;
             font-weight:700; color:${TINTA}; text-align:center; vertical-align:bottom; }
  thead th:first-child { text-align:left; color:${TINTA_SUAVE}; font-weight:700; }
  thead th.col-rec { background:${NAVY}; color:#FFFFFF; border-radius:2pt 2pt 0 0; }
  .rec-tag { font-size:6.5pt; font-weight:700; color:#7FC4FF; letter-spacing:.5pt;
             text-transform:uppercase; }
  tbody th { text-align:left; font-weight:700; padding:4.6pt 5pt; color:${TINTA}; }
  tbody td { text-align:center; padding:4.6pt 5pt; }
  tbody td.destaque { background:${AZUL_CLARO}; font-weight:700; color:${NAVY}; }
  tbody tr { border-bottom:.6pt solid ${CINZA_BORDA}; }

  .preservado { margin-top:9pt; height:68pt; flex-shrink:0; border-radius:3pt; display:flex;
                align-items:center; background:linear-gradient(100deg,${NAVY} 0%,#0092FF 130%); }
  .preservado .esq { width:190pt; padding:0 16pt; color:#FFFFFF; }
  .preservado .rot { font-size:7.5pt; letter-spacing:1pt; text-transform:uppercase; color:#BBD8FF; }
  .preservado .num { font-size:17pt; font-weight:700; margin-top:5pt; }
  .preservado .dir { flex:1; background:#FFFFFF; margin:8pt 16pt 8pt 0; border-radius:2pt;
                     padding:9pt 11pt; font-size:8pt; line-height:1.55; color:${TINTA}; }
  .preservado .dir b { color:${AZUL}; }

  .caracteristicas { background:${CINZA_FUNDO}; padding:7pt; display:flex; flex-wrap:wrap;
                     gap:6pt; }
  .caracteristicas div { width:calc(50% - 3pt); background:#FFFFFF; line-height:1.3;
                         border-left:1.8pt solid ${AZUL}; border-top:.6pt solid ${CINZA_BORDA};
                         border-right:.6pt solid ${CINZA_BORDA};
                         border-bottom:.6pt solid ${CINZA_BORDA}; padding:5pt 8pt; }
  .caracteristicas h3 { font-size:8pt; font-weight:700; color:${NAVY}; }
  .caracteristicas p { font-size:7pt; color:${TINTA_SUAVE}; margin-top:2pt; line-height:1.36; }

  .observacoes { margin-top:6pt; background:${CINZA_FAIXA}; border-left:2.2pt solid ${CINZA_BARRA};
                 padding:5pt 11pt; }
  .observacoes h4 { font-size:7pt; font-weight:700; letter-spacing:.5pt; text-transform:uppercase;
                    color:${TINTA}; margin-bottom:3pt; }
  .observacoes li { font-size:7pt; color:${TINTA_SUAVE}; list-style:none; line-height:1.3;
                    padding-left:6pt; position:relative; }
  .observacoes li::before { content:'•'; position:absolute; left:0; color:${AZUL}; }
  .observacoes li b { color:${TINTA}; }

  .assinatura { text-align:center; margin-top:4pt; padding-bottom:0; }
  /* A logo RT do projeto e branca, para o tema escuro da tela. Aqui ela cai
     sobre papel branco, entao vira tinta. brightness(0) preserva o recorte
     do monograma sem precisar de um segundo arquivo. */
  .assinatura img { height:22pt; filter:brightness(0); opacity:.82; }
  .assinatura p { font-family:'SerifIt',Georgia,serif; font-style:italic; font-size:7.5pt;
                  color:${TINTA_SUAVE}; margin-top:4pt; }
  .assinatura p b { font-family:'Heros'; font-style:normal; font-weight:700; color:${TINTA}; }

  .faixa-base { height:24pt; flex-shrink:0; background:${NAVY};
                color:#9FC6FF; font-size:7pt; letter-spacing:1.6pt; display:flex;
                align-items:center; justify-content:center; text-transform:uppercase; }
</style></head>
<body>
  <header class="faixa-topo">
    <img src="${logoBlue3()}" alt="Blue3 Investimentos">
    <div class="tag">Planejamento patrimonial<br>e sucessório</div>
  </header>

  <div class="corpo">
    <h1>ANÁLISE WHOLE LIFE 10 ANOS</h1>
    <p class="chamada">
      Esse estudo comparou <b>${linhas.length} seguradoras</b> em relação ao mesmo ativo de
      liquidez sucessória, elaborado para <b>${escapar(dados.nome)}</b>.
    </p>

    <dl class="perfil">
      <div><dt>Capital segurado</dt><dd>${dados.capitalFormatado}</dd></div>
      <div><dt>Perfil do segurado</dt><dd>${perfil}</dd></div>
      <div><dt>Período de aporte</dt><dd>10 anos</dd></div>
      <div><dt>Vigência</dt><dd>Vitalícia</dd></div>
      <div><dt>Estratégia</dt><dd>Whole Life</dd></div>
    </dl>
    ${complemento ? `<p class="chamada" style="margin-top:6pt;font-size:7.5pt">${escapar(complemento)}</p>` : ''}

    <h2>Ranking por aporte anual</h2><div class="regua"></div>
    <div class="cards">
      ${linhas
        .map(
          (l, i) => `
      <div class="card${i === 0 ? ' rec' : ''}">
        <div class="pos">${i + 1}º${i === 0 ? ' • Recomendada' : ''}</div>
        <div class="marca">${escapar(l.seguradora)}</div>
        <div class="valor">${l.aporteAnual}</div>
        <div class="delta">${i === 0 ? 'Referência' : diferenca(l, recomendada)}</div>
      </div>`,
        )
        .join('')}
    </div>

    <h2>Comparativo detalhado</h2><div class="regua"></div>
    <table>
      <thead><tr><th>Critério</th>${cabecalhoTabela}</tr></thead>
      <tbody>
        ${linhaTabela(
          'Aporte Anual',
          linhas.map((l) => l.aporteAnual),
        )}
        ${linhaTabela(
          'Aporte Acumulado em 10 Anos',
          linhas.map((l) => l.aporteAcumulado10a),
        )}
        ${linhaTabela(
          'Custo vs Capital Segurado',
          linhas.map((l) => l.custoSobreCapital),
        )}
        ${linhaTabela(
          'Break-even do Resgate<sup>1</sup>',
          linhas.map((l) => `${l.breakevenDocumento}º ano`),
        )}
        ${linhaTabela(
          'Valor de Resgate no 10º Ano<sup>1</sup>',
          linhas.map((l) => l.resgate10a),
        )}
      </tbody>
    </table>

    <div class="preservado">
      <div class="esq">
        <div class="rot">Valor preservado em 10 anos</div>
        <div class="num">${dados.valorPreservado}</div>
      </div>
      <div class="dir">
        Recurso preservado ao longo de <b>10 anos</b> na comparação entre a opção recomendada
        e a de maior custo desta análise. Considerando o capital segurado de
        ${dados.capitalFormatado} para melhor entendimento, a <b>${escapar(recomendada.seguradora)}</b>
        entrega a melhor relação custo-benefício para este perfil, levando em consideração
        fatores de underwriting das seguradoras apontadas no estudo comparativo.
      </div>
    </div>

    <h2>Características do Whole Life</h2><div class="regua"></div>
    <div class="caracteristicas">
      ${CARACTERISTICAS.map(([t, d]) => `<div><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>

    <div class="observacoes">
      <h4>Observações metodológicas</h4>
      <ul>
        <li><b>Base comparativa:</b> capital segurado de ${dados.capitalFormatado} aplicado
            uniformemente às ${linhas.length} seguradoras para garantir paridade de análise.</li>
        <li><b><sup>1</sup> Break-even do resgate:</b> primeiro ano em que o valor de resgate
            iguala ou supera o total de aportes pagos. Quanto menor, mais líquido o produto.</li>
        <li><b>Valores nominais:</b> aportes e resgates exibidos sem projeção inflacionária.
            A correção anual pelo IPCA está prevista em todos os contratos.</li>
        <li>Simulações completas de cada seguradora disponíveis mediante solicitação.</li>
      </ul>
    </div>

    <div class="assinatura">
      <img src="${logoRt()}" alt="Robson Tavernard">
      <p>Construído com atenção e respeito à sua história, por <b>Robson Vieira Tavernard</b>.</p>
    </div>
  </div>

  <footer class="faixa-base">@robsontavernard&nbsp;&nbsp;|&nbsp;&nbsp;@blue3investimentos</footer>
</body></html>`
}
