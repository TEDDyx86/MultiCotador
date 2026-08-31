import { fonteNegrito, fonteRegular, fonteSerifItalica, logoRt } from './ativos'

/**
 * Documento de metodologia em PDF, gerado a partir do proprio Markdown.
 *
 * O conteudo nao vive aqui: vive em `docs/METODOLOGIA-DE-CALCULO.md`, e este
 * modulo so o veste. Duas fontes de verdade para a mesma metodologia — uma no
 * repositorio e outra no template — divergiriam na primeira revisao, e a versao
 * apresentada formalmente seria justamente a que ninguem revisa.
 *
 * Diferencas para `template.ts`, que desenha o comparativo:
 *
 *  - varias paginas, sem altura travada. O comparativo cabe numa folha por
 *    decisao de produto; um documento tecnico nao tem esse limite;
 *  - a marca do Robson lidera, em navy sobre papel branco. O comparativo abre
 *    com a faixa da Blue3 porque e o material entregue ao cliente final;
 *  - margens desenhadas pelo Puppeteer, e nao pelo CSS: com quebra de pagina, a
 *    margem precisa se repetir em toda folha, e `padding` no corpo so vale na
 *    primeira.
 */

const NAVY = '#002060'
const AZUL = '#0092FF'
const AZUL_CLARO = '#E6F2FF'
const CINZA_BORDA = '#E5E5E5'
const CINZA_FUNDO = '#FAFAFA'
const TINTA = '#000416'
const TINTA_SUAVE = '#666666'
const TINTA_TABELA = '#2D2D2D'
const CINZA_ROTULO = '#999999'

/**
 * Margens da folha. As laterais sao as 39,7pt medidas no modelo do comparativo,
 * para os dois documentos assentarem na mesma coluna de texto.
 *
 * Em milimetros porque o Puppeteer recusa `pt` — ele aceita px, in, cm e mm, e
 * nada mais. A conversao e exata: 1pt = 25,4/72 mm.
 */
export const MARGEM_METODOLOGIA = {
  top: '18.34mm', // 52pt — abre espaco para a capa respirar
  right: '14.01mm', // 39,7pt
  bottom: '16.23mm', // 46pt — a faixa do rodape ocupa parte disso
  left: '14.01mm', // 39,7pt
}

/**
 * Rodape repetido. Vai como template do Chrome, entao toda a tipografia e
 * inline — o CSS do documento nao alcanca este trecho.
 */
export const RODAPE_METODOLOGIA = `
<div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:${TINTA_SUAVE};
            padding:0 39.7pt;display:flex;justify-content:space-between;align-items:center;">
  <span style="letter-spacing:.5pt;">METODOLOGIA DE CÁLCULO &nbsp;·&nbsp; MULTICOTADOR WHOLE LIFE</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>`

export interface DadosMetodologia {
  /** O corpo do documento em HTML, ja convertido a partir do Markdown. */
  corpo: string
  /** Data da revisao, por extenso, como sai na capa. */
  revisadoEm: string
}

export function montarHtmlMetodologia(dados: DadosMetodologia): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @font-face { font-family:'Heros'; font-weight:400; src:url('${fonteRegular()}') format('truetype'); }
  @font-face { font-family:'Heros'; font-weight:700; src:url('${fonteNegrito()}') format('truetype'); }
  @font-face { font-family:'SerifIt'; font-style:italic; src:url('${fonteSerifItalica()}') format('truetype'); }

  @page { size: A4; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Heros',Arial,sans-serif; color:${TINTA}; font-size:8.5pt;
         line-height:1.5; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* ---------- Capa ---------- */

  /* A marca em navy sobre o papel branco: e a arte oficial, sem filtro. */
  .capa { border-bottom:2.5pt solid ${NAVY}; padding-bottom:14pt; margin-bottom:20pt; }
  .capa img { height:26pt; }
  .capa .selo { margin-top:14pt; font-size:7pt; font-weight:700; letter-spacing:1.1pt;
                text-transform:uppercase; color:${AZUL}; }
  .capa h1 { font-size:21pt; font-weight:700; letter-spacing:-.3pt; line-height:23pt;
             margin-top:5pt; color:${TINTA}; }
  .capa .sub { font-size:9pt; color:${TINTA_SUAVE}; line-height:13pt; margin-top:7pt;
               max-width:400pt; }

  /* ---------- Titulos ---------- */

  /*
   * break-after:avoid em todo titulo. Sem isso o Chrome deixa um h2 sozinho
   * no pe da folha e joga a secao inteira para a seguinte — o defeito classico
   * de documento longo, e o mais visivel numa apresentacao formal.
   */
  h2 { font-size:12pt; font-weight:700; color:${NAVY}; margin-top:18pt; padding-bottom:4pt;
       border-bottom:.8pt solid ${CINZA_BORDA}; break-after:avoid; break-inside:avoid; }
  h2::after { content:''; display:block; width:52pt; height:2pt; background:${AZUL};
              position:relative; top:4.8pt; }
  h3 { font-size:9.5pt; font-weight:700; color:${TINTA}; margin-top:12pt;
       break-after:avoid; }
  h2 + h3, h2 + p { margin-top:9pt; }

  p { margin-top:6pt; }
  strong { font-weight:700; color:${TINTA}; }

  /* ---------- Listas ---------- */

  ul, ol { margin-top:6pt; padding-left:13pt; }
  li { margin-top:3pt; }
  li::marker { color:${AZUL}; }

  /* ---------- Tabelas ---------- */

  /*
   * O thead como grupo de cabecalho faz o Chrome repetir a primeira linha em
   * toda folha que a tabela atravessa. Sem isso, a continuacao de uma tabela
   * longa chega na pagina seguinte sem dizer de que coluna e cada numero.
   */
  table { width:100%; border-collapse:collapse; font-size:7.8pt; margin-top:9pt;
          break-inside:auto; }
  thead { display:table-header-group; }
  tr { break-inside:avoid; }
  th { background:${NAVY}; color:#FFFFFF; font-weight:700; text-align:left;
       padding:4.5pt 6pt; font-size:7.3pt; letter-spacing:.3pt; text-transform:uppercase;
       border-right:.6pt solid rgba(255,255,255,.18); }
  th:last-child { border-right:none; }
  td { padding:4.2pt 6pt; color:${TINTA_TABELA}; border-bottom:.6pt solid ${CINZA_BORDA};
       border-right:.6pt solid ${CINZA_BORDA}; vertical-align:top; }
  td:last-child { border-right:none; }
  tbody tr:nth-child(even) td { background:${CINZA_FUNDO}; }
  /* Numero alinhado a direita nasce do alinhamento que o Markdown declara. */
  th[align="right"], td[align="right"] { text-align:right; }
  th[align="center"], td[align="center"] { text-align:center; }
  td strong { color:${NAVY}; }

  /*
   * Tabela de duas colunas sem cabecalho: o bloco de metadados da capa. O
   * Markdown a escreve com cabecalho vazio, entao ela chega aqui como qualquer
   * outra e precisa perder a faixa navy.
   */
  table.meta th { display:none; }
  table.meta td:first-child { width:170pt; font-weight:700; color:${TINTA};
                              background:${AZUL_CLARO}; }
  table.meta tbody tr:nth-child(even) td { background:${CINZA_FUNDO}; }
  table.meta tbody tr:nth-child(even) td:first-child { background:${AZUL_CLARO}; }

  /* ---------- Codigo e formulas ---------- */

  /*
   * As formulas vao em bloco de codigo. Fonte monoespacada de verdade: numa
   * proporcional, (1+i)^n ÷ 10 perde o alinhamento que faz a formula legivel.
   */
  pre { background:${CINZA_FUNDO}; border-left:2.2pt solid ${AZUL}; border-top:.6pt solid ${CINZA_BORDA};
        border-right:.6pt solid ${CINZA_BORDA}; border-bottom:.6pt solid ${CINZA_BORDA};
        padding:7pt 10pt; margin-top:8pt; font-size:8pt; line-height:1.55;
        white-space:pre-wrap; break-inside:avoid; }
  pre, code { font-family:'Consolas','DejaVu Sans Mono',monospace; }
  code { font-size:7.8pt; color:${NAVY}; background:${AZUL_CLARO}; padding:.5pt 2.5pt;
         border-radius:2pt; }
  pre code { background:none; padding:0; color:${TINTA}; font-size:8pt; }

  /* ---------- Citacao em destaque ---------- */

  blockquote { border-left:2.2pt solid ${AZUL}; background:${AZUL_CLARO};
               padding:7pt 11pt; margin-top:9pt; break-inside:avoid; }
  blockquote p { margin:0; font-size:8.5pt; line-height:1.5; }
  blockquote p + p { margin-top:5pt; }

  /* ---------- Regua ---------- */

  /*
   * O tres-tracos do Markdown separa secoes no arquivo, mas no papel ele duplicaria a
   * linha que o proprio h2 ja desenha logo abaixo. Some, e o respiro fica.
   */
  hr { border:none; height:0; margin-top:8pt; }

  /* ---------- Assinatura ---------- */

  .assinatura { margin-top:26pt; padding-top:12pt; border-top:.8pt solid ${CINZA_BORDA};
                text-align:center; break-inside:avoid; }
  .assinatura img { height:19pt; }
  .assinatura p { font-family:'SerifIt',Georgia,serif; font-style:italic; font-size:8pt;
                  color:${TINTA_SUAVE}; margin-top:5pt; }
  .assinatura p b { font-family:'Heros'; font-style:normal; font-weight:700; color:${TINTA}; }
  .assinatura .ref { font-family:'Heros'; font-style:normal; font-size:7pt;
                     color:${CINZA_ROTULO}; margin-top:6pt; }
</style></head>
<body>
  <header class="capa">
    <img src="${logoRt()}" alt="Robson Tavernard">
    <div class="selo">Planejamento patrimonial e sucessório</div>
    <h1>Metodologia de cálculo</h1>
    <p class="sub">
      Documento técnico de validação do Multicotador Whole Life. Descreve como cada número
      apresentado na tela e no comparativo é apurado, sob que premissas e contra que
      referência foi conferido.
    </p>
  </header>

  ${dados.corpo}

  <div class="assinatura">
    <img src="${logoRt()}" alt="Robson Tavernard">
    <p>Construído com atenção e respeito à sua história, por <b>Robson Vieira Tavernard</b>.</p>
    <p class="ref">Revisão de ${dados.revisadoEm} · gerado a partir de docs/METODOLOGIA-DE-CALCULO.md</p>
  </div>
</body></html>`
}
