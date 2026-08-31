import { fonteNegrito, fonteRegular, fonteSerifItalica, logoBlue3, logoRt } from './ativos'
import type { LinhaResultado } from '@/app/acoes'
import type { Modalidade } from '@/lib/dominio/tipos'

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

/**
 * Tintas de texto, extraidas dos proprios spans do modelo.
 *
 * TINTA nao e preto: e um quase-preto azulado. E as tres tintas sao distintas
 * de proposito no modelo — titulo e rotulo em TINTA, corrido em TINTA_SUAVE,
 * numero de tabela em TINTA_TABELA. Uniformizar as tres achata a hierarquia.
 */
const TINTA = '#000416'
const TINTA_SUAVE = '#666666'
const TINTA_TABELA = '#2D2D2D'
const CINZA_ROTULO = '#999999'

/**
 * Faixa do topo: gradiente horizontal que escurece a esquerda e satura em navy
 * antes da metade da folha — nao e um degrade de ponta a ponta.
 */
const TOPO_INICIO = '#000D39'

/**
 * Faixa "Valor preservado": gradiente horizontal, uniforme na vertical, com o
 * texto em branco e os destaques em ciano.
 *
 * As nove paradas saem de uma amostragem do modelo ao longo da faixa, e nao de
 * uma interpolacao entre as duas pontas. A curva do original nao e linear —
 * escurece devagar no comeco e acelera para o azul no fim. Com duas paradas so,
 * as pontas batiam e o miolo inteiro saia claro demais.
 */
const FAIXA_GRADIENTE =
  'linear-gradient(90deg,#000C38 0%,#001448 12.5%,#001C58 25%,#00266F 37.5%,' +
  '#00318A 50%,#003CA4 62.5%,#0058C2 75%,#0075E0 87.5%,#0091FE 100%)'
const CIANO = '#00FFFF'

export interface DadosDocumento {
  nome: string
  idade: number
  sexo: 'M' | 'F'
  capitalFormatado: string
  comparativo: LinhaResultado[]
  valorPreservado: string
  /** Verdadeiro quando os valores estao reexpressos em moeda futura. */
  projetada?: boolean
  /** A taxa usada na projecao, ja formatada ("5,0%"). */
  taxaIpca?: string
  /** Ausente equivale a `com-resgate`, a modalidade que o documento sempre teve. */
  modalidade?: Modalidade
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * O capital no texto corrido, sem os centavos quando eles sao zero.
 *
 * O modelo escreve "R$ 1.000.000" no meio da frase e "R$ 1.000.000,00" na faixa
 * de perfil — valor exato onde ele e dado, valor redondo onde ele e argumento.
 * Os centavos so caem quando nao dizem nada; um capital quebrado continua
 * inteiro, porque ali arredondar seria omitir.
 */
function capitalNoTexto(formatado: string): string {
  return formatado.replace(/,00$/, '')
}

/**
 * A chamada quebra para uma segunda linha?
 *
 * A folha inteira foi calibrada contra o modelo, que tem um nome curto e uma
 * chamada de uma linha so. Um nome comprido joga o nome inteiro para a segunda
 * linha (ele nunca parte no meio) e acrescenta 11pt — mais do que a folga que
 * sobra na pagina. O documento entao passa de uma folha, e passa em silencio: o
 * rodape simplesmente sai da area impressa.
 *
 * As duas medidas saem do modelo: o texto fixo da chamada ocupa 430,5pt dos
 * 515,9pt da linha, deixando 85,4pt para o nome, e "John Daniel" gasta 51pt em
 * 11 caracteres. Como o teste so decide um recuo de 4pt, errar por um caractere
 * nao quebra nada.
 */
const LARGURA_CARACTERE = 4.64
const ESPACO_PARA_NOME = 85.4

function chamadaQuebra(nome: string): boolean {
  return nome.length * LARGURA_CARACTERE > ESPACO_PARA_NOME
}

/** Contagem por extenso, como o modelo escreve nas observacoes. */
const EXTENSO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis']
function porExtenso(n: number): string {
  return EXTENSO[n] ?? String(n)
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

/**
 * Os tres primeiros quadros valem para as duas modalidades. O quarto nao: o
 * documento afirmava "direito de resgate" em folha assinada, e nos produtos sem
 * reserva isso e simplesmente falso. E o unico texto fixo do modelo que a
 * modalidade obriga a trocar.
 */
const CARACTERISTICAS_COMUNS = [
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
]

const CARACTERISTICA_COM_RESGATE = [
  'Direito de resgate',
  'Formação de reserva resgatável a partir do 25º mês, oferecendo liquidez financeira ao segurado em vida.',
]

const CARACTERISTICA_SEM_RESGATE = [
  'Proteção pura, sem reserva',
  'O aporte custeia integralmente a cobertura. Não há formação de reserva nem valor de resgate em vida — daí o custo anual menor.',
]

export function montarHtml(dados: DadosDocumento): string {
  const { comparativo: linhas } = dados
  const recomendada = linhas[0]
  const perfil = `${dados.sexo === 'M' ? 'Masculino' : 'Feminino'}, ${dados.idade} anos`
  const comResgate = dados.modalidade !== 'sem-resgate'

  const caracteristicas = [
    ...CARACTERISTICAS_COMUNS,
    comResgate ? CARACTERISTICA_COM_RESGATE : CARACTERISTICA_SEM_RESGATE,
  ]

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
  @font-face { font-family:'Heros'; font-weight:400; src:url('${fonteRegular()}') format('truetype'); }
  @font-face { font-family:'Heros'; font-weight:700; src:url('${fonteNegrito()}') format('truetype'); }
  @font-face { font-family:'SerifIt'; font-style:italic; src:url('${fonteSerifItalica()}') format('truetype'); }

  @page { size: A4; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  /* Altura fixa de uma pagina A4 e coluna flex: o rodape encosta na base e o
     conteudo nao empurra nada para uma segunda folha. O estudo e de 1 pagina. */
  body { font-family:'Heros',Arial,sans-serif; color:${TINTA}; font-size:7.5pt;
         width:595.3pt; height:841.9pt; display:flex; flex-direction:column;
         overflow:hidden;
         -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .faixa-topo { height:59.5pt; flex-shrink:0;
                background:linear-gradient(90deg,${TOPO_INICIO} 0%,${NAVY} 60%);
                display:flex; align-items:center; justify-content:space-between;
                padding:0 39.7pt; }
  /* 28,3pt: a altura que a marca ocupa no modelo, medida no proprio cabecalho. */
  .faixa-topo img { height:28.3pt; }
  /* Duas cores: a primeira linha em ciano, a segunda em branco. */
  .faixa-topo .tag { color:${CIANO}; font-size:7.5pt; font-weight:700; letter-spacing:.9pt;
                     text-align:right; line-height:10.9pt; text-transform:uppercase;
                     margin-bottom:0; }
  .faixa-topo .tag span { color:#FFFFFF; }

  .corpo { padding:0 39.7pt; flex:1; }

  /*
   * Entrelinha explicita em todo bloco de texto.
   *
   * A TeX Gyre Heros pede um leading padrao de ~1,58, bem mais largo que o do
   * modelo. Deixado no automatico, cada linha nascia alguns decimos mais alta e
   * o erro somava folha abaixo: no fim da tabela ja eram 18pt de defasagem.
   */
  h1 { color:${TINTA}; font-size:18pt; font-weight:700; letter-spacing:-.15pt;
       line-height:18pt; margin-top:11.8pt; }
  .chamada { font-size:9pt; color:${TINTA_SUAVE}; line-height:11pt; margin-top:9.1pt; }
  .chamada b { color:${TINTA}; }
  /* O nome nunca parte no meio: "Maria Fer-/nanda" num documento entregue ao
     cliente le como erro de impressao. Quebra antes do nome, nunca dentro. */
  .chamada .nome { white-space:nowrap; }
  /* Quando a chamada ocupa duas linhas, os 11pt a mais saem de dois respiros —
     4pt antes da faixa de perfil e 3pt antes da assinatura. Divididos, nenhum
     dos dois chega a saltar aos olhos; concentrados num so, saltariam. Fora
     esse caso o documento nao se mexe. */
  .chamada.longa + .perfil { margin-top:6.7pt; }
  .corpo:has(.chamada.longa) .assinatura { margin-top:12.2pt; }

  .perfil { margin-top:10.7pt; background:${CINZA_FAIXA}; border-left:2.2pt solid ${AZUL};
            height:37.9pt; flex-shrink:0; display:flex; align-items:center;
            padding-left:12pt; }
  /* Cinco colunas de largura igual: no modelo os rotulos comecam de 100,35 em
     100,35pt. Com largura por conteudo, "10 anos" e "Whole Life" saiam do
     lugar porque sao textos mais curtos que os vizinhos. */
  .perfil div { width:100.35pt; padding:0; }
  .perfil dt { font-size:7pt; font-weight:700; color:${CINZA_ROTULO}; letter-spacing:.5pt;
               text-transform:uppercase; }
  .perfil dd { font-size:9pt; font-weight:700; color:${TINTA}; margin-top:1.4pt; }

  h2 { color:${TINTA}; font-size:9.5pt; font-weight:700; letter-spacing:.49pt;
       text-transform:uppercase; margin-top:10.4pt; padding-bottom:3pt; }
  /*
   * Recuo por secao, e nao um valor unico para os tres h2.
   *
   * Cada bloco acima deixa uma sobra diferente, e no modelo os tres respiros
   * tambem sao diferentes. Tentar resolver pelo margin-bottom do bloco anterior
   * nao funciona: margens verticais adjacentes colapsam para a maior, entao o
   * ajuste era engolido pelo margin-top do proprio h2.
   */
  .cards + h2 { margin-top:12.2pt; }
  .cards + h2 + .regua { margin-bottom:11.2pt; }
  .preservado + h2 + .regua { margin-bottom:12.5pt; }
  .preservado + h2 { margin-top:9.6pt; }
  .regua { height:1pt; background:${CINZA_BORDA}; position:relative; margin-bottom:8.3pt; }
  .regua::before { content:''; position:absolute; left:0; top:0; width:78pt; height:1pt;
                   background:${AZUL}; }

  .cards { display:flex; gap:7pt; }
  /* Altura travada na medida do modelo: sem isso o card cresce com o leading do
     conteudo e empurra tudo que vem abaixo dele na folha. */
  .card { flex:1; height:75.7pt; border:.8pt solid ${CINZA_BORDA}; border-radius:3pt;
          padding:7pt 6pt; text-align:center; }
  /* Gradiente branco -> azul claro, como no modelo. O chapado deixava o card
     recomendado pesado ao lado dos tres brancos; o degrade o destaca sem peso. */
  /* O card recomendado e 2pt mais largo que os outros no modelo, o que empurra
     os tres seguintes para a direita. Travado por medida, e nao por flex:1, ou
     os quatro sairiam iguais e desalinhados do original. */
  .card.rec { flex:0 0 125.2pt; padding-top:8.5pt; border:1.2pt solid ${AZUL};
              background:linear-gradient(180deg,#FFFFFF 0%,${AZUL_CLARO} 100%); }
  .card .pos { font-size:7pt; font-weight:700; color:${CINZA_ROTULO}; letter-spacing:.5pt;
               text-transform:uppercase; }
  .card.rec .pos { color:${AZUL}; letter-spacing:0; }
  .card .marca { font-size:11pt; font-weight:700; color:${TINTA}; margin-top:4.3pt; }
  .card .valor { font-size:9pt; font-weight:700; color:${TINTA}; margin-top:4.5pt; }
  .card .delta { font-size:7pt; color:${TINTA_SUAVE}; margin-top:3.3pt; }
  .card.rec .delta { color:${AZUL}; font-weight:700; }

  /*
   * Layout fixo com a primeira coluna travada em 159,9pt: as quatro
   * colunas de seguradora se dividem o resto em partes iguais, como no modelo.
   * Sem isso o navegador dimensiona pelo conteudo e a coluna de criterios
   * engordava, empurrando os numeros para fora do lugar.
   */
  table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:9pt; }
  /* A coluna recomendada tem duas linhas e assenta 3,2pt mais acima do que as
     de uma linha so — no modelo os dois recuos inferiores sao diferentes. */
  thead th { background:#FFFFFF; border-bottom:.8pt solid ${CINZA_BORDA};
             padding:3.8pt 5pt 3.7pt; line-height:10.8pt;
             font-weight:700; color:${TINTA}; text-align:center; vertical-align:bottom; }
  thead th.col-rec { padding-bottom:6.9pt; }
  .rec-tag { line-height:14pt; }
  thead th:first-child, tbody th { width:159.9pt; }
  thead th:first-child { text-align:left; background:${CINZA_FUNDO}; padding-left:8pt; }
  thead th.col-rec { background:${NAVY}; color:#FFFFFF; border-radius:2pt 2pt 0 0; }
  .rec-tag { font-size:6.5pt; font-weight:700; color:${CIANO}; letter-spacing:.59pt;
             text-transform:uppercase; }
  /* Entrelinha travada: com o leading automatico a linha nao so ficava alta
     como variava entre a celula em negrito e a normal, e os numeros de uma
     mesma linha assentavam em alturas diferentes. */
  tbody th, tbody td { line-height:10.8pt; vertical-align:baseline; }
  tbody th { text-align:left; font-weight:700; padding:4.1pt 8pt; color:${TINTA};
             background:${CINZA_FUNDO}; }
  tbody td { text-align:center; padding:4.1pt 5pt; color:${TINTA_TABELA}; }
  tbody td.destaque { background:${AZUL_CLARO}; font-weight:700; }
  tbody tr { border-bottom:.6pt solid ${CINZA_BORDA}; }
  /* Grade vertical entre as seguradoras, como no modelo. So com as reguas
     horizontais os quatro valores de uma linha corriam juntos e a leitura
     "qual numero e de quem" dependia de mirar o cabecalho la em cima. */
  tbody th, tbody td { border-right:.75pt solid ${CINZA_BORDA}; }
  tbody td:last-child { border-right:none; }
  /* Sem isto a chamada de nota estica a altura das duas linhas que a usam, e a
     tabela perde o passo de 19,45pt do modelo. */
  sup { font-size:6pt; }
  tbody th sup { line-height:0; }

  /*
   * Faixa unica: o gradiente e a superficie, e todo o texto assenta em branco
   * sobre ele.
   *
   * O texto da direita ficava num cartao branco sobreposto a faixa. Isso trazia
   * dois defeitos de uma vez: o paragrafo saia em tinta preta onde o modelo pede
   * branco, e o cartao cobria o gradiente deixando uma tira azul solta na
   * margem — a "inversao de camadas". Sem o cartao, os dois somem juntos.
   *
   * Gradiente na horizontal e uniforme na vertical, amostrado no modelo de ponta
   * a ponta da faixa.
   */
  .preservado { margin-top:8.8pt; height:78pt; flex-shrink:0; border-radius:3pt; display:flex;
                align-items:center; color:#FFFFFF;
                background:${FAIXA_GRADIENTE}; }
  .preservado .esq { width:205pt; padding:0 16pt; }
  .preservado .rot { font-size:7.5pt; letter-spacing:1pt; text-transform:uppercase; }
  .preservado .num { font-size:17pt; font-weight:700; margin-top:6.6pt; }
  .preservado .dir { flex:1; padding-right:16pt; font-size:8.5pt; line-height:1.49; }
  /* Ciano e o unico realce que sobrevive ao azul da faixa: o azul do resto do
     documento sumiria dentro dela. */
  .preservado .dir b { color:${CIANO}; }

  /* No modelo o fundo cinza tem recuo so em cima e embaixo: os quadros brancos
     encostam nas margens laterais da folha, alinhados com a tabela. */
  .caracteristicas { background:${CINZA_FUNDO}; padding:6pt 0; display:flex; flex-wrap:wrap;
                     gap:5.4pt; }
  .caracteristicas div { width:calc(50% - 2.7pt); height:46.4pt; background:#FFFFFF;
                         line-height:1.3;
                         border-left:1.8pt solid ${AZUL}; border-top:.6pt solid ${CINZA_BORDA};
                         border-right:.6pt solid ${CINZA_BORDA};
                         border-bottom:.6pt solid ${CINZA_BORDA}; padding:2.8pt 8pt 0 9.4pt; }
  .caracteristicas h3 { font-size:8.5pt; font-weight:700; color:${TINTA}; }
  .caracteristicas p { font-size:7.5pt; color:${TINTA_SUAVE}; margin-top:5.2pt; line-height:10.3pt; }

  .observacoes { margin-top:3.6pt; background:${CINZA_FAIXA}; border-left:2.2pt solid ${CINZA_BARRA};
                 padding:5.5pt 12pt 5.4pt; }
  .observacoes h4 { font-size:7.5pt; font-weight:700; letter-spacing:.4pt; text-transform:uppercase;
                    color:${TINTA}; line-height:10.8pt; margin-bottom:5.8pt; }
  .observacoes li { font-size:7pt; color:${TINTA_TABELA}; list-style:none; line-height:10.1pt;
                    padding-left:4.4pt; position:relative; }
  .observacoes li::before { content:'•'; position:absolute; left:0; color:${AZUL}; }
  .observacoes li b { color:${TINTA}; }

  .assinatura { text-align:center; margin-top:15.2pt; padding-bottom:0; }
  /* A arte ja vem em navy: sem filtro e sem opacidade, a assinatura sai na
     mesma tinta do modelo. */
  .assinatura img { height:21pt; }
  .assinatura p { font-family:'SerifIt',Georgia,serif; font-style:italic; font-size:7.5pt;
                  color:${TINTA_SUAVE}; margin-top:4pt; }
  .assinatura p b { font-family:'Heros'; font-style:normal; font-weight:700; color:${TINTA}; }

  .faixa-base { height:24pt; flex-shrink:0; background:${NAVY};
                color:#FFFFFF; font-size:7.5pt; letter-spacing:1.6pt; display:flex;
                align-items:center; justify-content:center; text-transform:uppercase; }
</style></head>
<body>
  <header class="faixa-topo">
    <img src="${logoBlue3()}" alt="Blue3 Investimentos">
    <div class="tag">Planejamento patrimonial<br><span>e sucessório</span></div>
  </header>

  <div class="corpo">
    <h1>ANÁLISE WHOLE LIFE 10 ANOS</h1>
    <p class="chamada${chamadaQuebra(dados.nome) ? ' longa' : ''}">
      Esse estudo comparou <b>${linhas.length} seguradoras</b> em relação ao mesmo ativo de
      liquidez sucessória, elaborado para <b class="nome">${escapar(dados.nome)}</b>.
    </p>

    <dl class="perfil">
      <div><dt>Capital segurado</dt><dd>${dados.capitalFormatado}</dd></div>
      <div><dt>Perfil do segurado</dt><dd>${perfil}</dd></div>
      <div><dt>Período de aporte</dt><dd>10 anos</dd></div>
      <div><dt>Vigência</dt><dd>Vitalícia</dd></div>
      <div><dt>Estratégia</dt><dd>Whole Life</dd></div>
    </dl>

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
          // Na visao projetada o rotulo precisa dizer de que ano e o valor: o
          // aporte da primeira parcela nao muda, o que cresce e o acumulado.
          dados.projetada ? 'Aporte Anual (1º ano)' : 'Aporte Anual',
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
        ${
          /*
           * Sem reserva nao ha o que apresentar nestas duas linhas. Imprimi-las
           * zeradas seria pior que omiti-las: "R$ 0,00" num documento assinado
           * le como resgate frustrado, e nao como produto que nunca prometeu
           * resgate. Some com elas a nota de rodape 1, que so as explicava.
           */
          comResgate
            ? `${linhaTabela(
                'Break-even do Resgate<sup>1</sup>',
                linhas.map((l) => `${l.breakevenDocumento}º ano`),
              )}
        ${linhaTabela(
          'Valor de Resgate no 10º Ano<sup>1</sup>',
          linhas.map((l) => l.resgate10a),
        )}`
            : ''
        }
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
        ${capitalNoTexto(dados.capitalFormatado)} para melhor entendimento, a <b>${escapar(recomendada.seguradora)}</b>
        entrega a melhor relação custo-benefício para este perfil, levando em consideração
        fatores de underwriting das seguradoras apontadas no estudo comparativo.
      </div>
    </div>

    <h2>Características do Whole Life</h2><div class="regua"></div>
    <div class="caracteristicas">
      ${caracteristicas.map(([t, d]) => `<div><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>

    <div class="observacoes">
      <h4>Observações metodológicas</h4>
      <ul>
        <li><b>Base comparativa:</b> capital segurado de ${capitalNoTexto(dados.capitalFormatado)} aplicado
            uniformemente às ${porExtenso(linhas.length)} seguradoras para garantir paridade de análise.</li>
        ${
          comResgate
            ? `<li><b>Break-even do resgate<sup>1</sup>:</b> primeiro ano em que o valor de resgate
            iguala ou supera o total de aportes pagos. Quanto menor, mais líquido o produto.</li>`
            : `<li><b>Sem formação de reserva:</b> estes produtos não acumulam valor resgatável.
            O aporte é integralmente destinado à cobertura, e por isso não se compara ao de
            produtos com reserva.</li>`
        }
        ${
          /*
           * O pressuposto ocupa o lugar do marcador que ja existia, em vez de
           * virar um item novo: a folha e calibrada linha a linha, e uma
           * quarta observacao empurraria a assinatura para fora dela.
           */
          dados.projetada
            ? `<li><b>Valores projetados:</b> aporte, resgate e capital corrigidos por IPCA de
            ${dados.taxaIpca} a.a. Moeda futura, não poder de compra de hoje.</li>`
            : `<li><b>Valores nominais:</b> aportes e resgates exibidos sem projeção inflacionária.
            A correção anual pelo IPCA está prevista em todos os contratos.</li>`
        }
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
