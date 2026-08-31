# Metodologia de cálculo — Multicotador Whole Life

**Documento técnico de validação.** Descreve, passo a passo, como cada número
apresentado na tela e no comparativo em PDF é apurado, com que dado de entrada,
sob que arredondamento e contra que referência foi conferido.

| | |
|---|---|
| Versão da base de tarifas | `2026.08` — estudos coletados entre dez/2025 e jun/2026 |
| Última revisão deste documento | 31 de agosto de 2026 |
| Escopo | Seguro de vida inteira (*whole life*) com aporte em 10 anos |
| Pendências e decisões adiadas | [`PENDENCIAS.md`](./PENDENCIAS.md) |

---

## 1. Fontes e base de dados

Nenhum prêmio é estimado por fórmula atuarial própria. O sistema **reproduz** as
tabelas que as seguradoras assinam; não as recalcula.

### 1.1 Origem das tarifas

As tarifas são extraídas dos estudos oficiais emitidos pelas próprias
seguradoras, arquivados em `ESTUDOS POR IDADE/`, e versionadas em
`dados/tarifas.json`.

| Fonte | Registros | O que significa |
|---|---:|---|
| `PDF` | 719 | Estudo oficial da seguradora, arquivado e rastreável |
| `XLSX` | 2 | Planilha da seguradora, sem PDF correspondente |
| `ESTIMADO` | 1 | Interpolação matemática, sem estudo de origem |
| **Total** | **722** | |

O único registro `ESTIMADO` (MAG Sucessão, homem, 63 anos) é sinalizado na
interface com o selo *estimada*, e a observação correspondente é impressa no
bloco de ressalvas ao assessor. Nenhum valor estimado entra num documento sem
essa marcação.

### 1.2 Estrutura dos dados versionados

| Arquivo | Registros | Conteúdo |
|---|---:|---|
| `dados/produtos.json` | 6 | Cadastro dos produtos e suas faixas etárias |
| `dados/tarifas.json` | 722 | Prêmio anual líquido por produto, sexo e idade |
| `dados/resgates.json` | 486 | Valor de resgate no 10º ano e break-even real |
| `dados/gabarito.json` | 719 | Casos de regressão contra os estudos originais |
| `dados/safra.json` | — | Versão e data de geração da base |

A tarifa é gravada **normalizada para o capital de referência de R$ 1.000.000**,
com 6 casas decimais, no campo `taxaAnualPor1mm`.

### 1.3 Produtos cadastrados

| Produto | Seguradora | Faixa etária | Forma reserva |
|---|---|---|---|
| Vida Horizonte | Icatu | 18–75 | Sim |
| Whole Life Integral 10 Anos | MAG | 16–80 | Sim |
| Vida Total | MetLife | 18–75 | Sim |
| Vida Inteira | Prudential | 14–75 | Sim |
| Whole Life Sucessão 10 Anos | MAG | 16–80 | **Não** |
| Vida Total Legado | MetLife | 18–70 | **Não** |

---

## 2. Cotação do prêmio

Implementação em `lib/motor/cotacao.ts`.

### 2.1 Linearidade do capital

O prêmio escala proporcionalmente ao capital segurado, sem taxa fixa de apólice:

```
prêmio anual líquido = taxaAnualPor1mm × (capital ÷ 1.000.000)
```

**Base da premissa:** as cotações de R$ 700 mil da MAG caem exatamente sobre a
curva normalizada a partir de R$ 1 milhão. A validação é indireta — nenhuma
seguradora publicou a regra explicitamente. Limites mínimo e máximo de capital
por seguradora seguem por confirmar (`PENDENCIAS.md`, seção 5).

O teto por idade, quando existe, é respeitado: `capitalMax` na tarifa. Excedido,
o produto não é cotado e a razão aparece na lista de indisponíveis.

### 2.2 Aplicação do IOF

Alíquota de **0,38%** sobre prêmio de seguro de pessoas:

```
prêmio anual com IOF = prêmio anual líquido × 1,0038
```

As seguradoras não publicam da mesma forma. Icatu e MAG imprimem o prêmio **já
com IOF**; MetLife e Prudential imprimem o **líquido** e somam o imposto à parte.
Essa divergência de convenção está registrada por produto no campo
`premioJaComIof`, e é resolvida **na ingestão**, não no cálculo: os prêmios
publicados com IOF são divididos por 1,0038 antes de virarem tarifa
(`_analise/tabela_mestre.py`). Assim, `taxaAnualPor1mm` é sempre líquida e o
motor aplica o IOF uma única vez, de maneira uniforme.

### 2.3 Arredondamento

Duas regras, e a ordem entre elas importa:

1. **Arredondar apenas na saída.** O IOF e a divisão pelo capital de referência
   operam sobre o valor de precisão plena. Arredondar antes propagaria o erro
   para o prêmio mensal.
2. **Centavos, meio para cima** (`ROUND_HALF_UP`), como faz o mercado
   financeiro.

Toda a aritmética usa `decimal.js`, **não ponto flutuante nativo**. Isso não é
preciosismo: em binário, `0,1 + 0,2 ≠ 0,3`, e um comparativo que precisa bater ao
centavo com o estudo da seguradora não sobreviveria a esse erro acumulado.

**Prêmio mensal** é calculado como `anual ÷ 12`, por decisão do usuário. As
seguradoras cobram mais que isso no fracionamento — a Prudential exatamente
+5,96%. O mensal exibido está, portanto, **abaixo** do que o cliente pagaria de
fato. Ver seção 10.

---

## 3. Aporte acumulado em 10 anos

```
acumulado = prêmio anual com IOF × 10
```

Sem capitalização e sem correção: são dez parcelas do mesmo valor nominal, que é
o que o contrato de aporte em 10 anos estabelece. A correção anual pelo IPCA,
prevista em contrato, é tratada à parte na seção 6.

### 3.1 Custo sobre o capital segurado

```
custo vs capital = (acumulado ÷ capital) × 100     → uma casa decimal
```

Lê-se: "quanto do capital segurado foi desembolsado para obtê-lo". É o indicador
que permite comparar produtos com capitais diferentes.

---

## 4. Valor de resgate

```
resgate no 10º ano = resgate10aPor1mm × (capital ÷ 1.000.000)
```

O valor não é projetado nem modelado: vem da tabela de reservas do próprio
estudo da seguradora, versionada em `dados/resgates.json`.

**Produtos sem formação de reserva não têm registro nesta tabela** — não é dado
faltante, é característica do produto. Para eles o resgate é zero e o break-even
inexistente (ver seção 7).

---

## 5. Break-even (resgate × acumulado)

Definição: **primeiro ano em que o valor de resgate iguala ou supera o total de
aportes pagos.**

```
break-even = min { n : resgate(n) ≥ acumulado(n) }
```

O sistema trabalha com **dois valores distintos**, e confundi-los seria grave:

| | O que é | Onde aparece |
|---|---|---|
| `breakevenReal` | O ano apurado no estudo da seguradora, ano a ano | **Tela**, para o assessor |
| `breakevenDocumento` | Fixo no **10º ano**, por decisão de negócio | **PDF**, para o cliente |

### 5.1 Por que o documento fixa o 10º ano

Análise sobre as 486 combinações de resgate versionadas:

| Faixa | Break-even é 10 | Resgate no 10º ano vs aportado |
|---|---|---|
| 30–50 anos | 74,3% dos casos | mínimo **100,0%** |
| 30–55 anos | 69,6% | mínimo 97,3% |
| Base inteira | 49,2% | mínimo 29,3% |

Na faixa em que o produto efetivamente vende, a fixação é correta e, quando erra,
erra **para menos** (a MAG faz break-even no 9º ano — o documento é conservador).

Distribuição completa da base: 239 combinações fazem break-even exatamente no
10º ano, 68 antes disso, 56 depois, e em **123 combinações o resgate nunca
alcança o aportado**.

**Risco assumido e declarado:** acima de 55 anos a fixação degrada. Aos 65 anos o
cliente tem 86–89% do aportado; aos 70, cerca de 77%. Nessas idades o documento
afirma um break-even que não se verifica. O assessor vê o número real na tela e
decide como conduzir a apresentação.

---

## 6. Correção por IPCA

Implementação em `lib/dominio/indexacao.ts` e `lib/motor/projecao.ts`.

As tabelas das seguradoras trazem **valor presente**. O contrato, porém, corrige
prêmio, capital e reserva anualmente pela inflação. A projeção responde "quanto
vou pagar e receber em reais daquele ano" — e nada além disso.

> **Corrigir os dois lados pelo mesmo índice não muda o poder de compra nem o
> ranking.** Muda apenas a unidade em que tudo está expresso. O documento
> imprime explicitamente que se trata de moeda futura.

Taxa padrão: **5,0% ao ano**, editável na tela de 0% a 20%. A taxa efetivamente
usada é sempre impressa no documento, o que impede que saia número sem
procedência. Horizonte: 10 anos.

### 6.1 Fator de valor único × fator de série

Este é o ponto onde um erro custaria caro, e por isso são **dois fatores
distintos**:

| Fator | Fórmula | Aplica-se a | A 5% / 10 anos |
|---|---|---|---|
| Valor único | `(1+i)ⁿ` | Resgate, capital segurado | **1,628894627** |
| Série de aportes | `[(1+i)ⁿ − 1] ÷ i` | Aporte acumulado | **12,577892536** |
| Custo sobre capital | `série ÷ (valor único × n)` | Percentual de custo | **0,772173493** |

**Por que não pode ser o mesmo fator:** um valor único cresce por `(1+i)ⁿ`. Os
dez aportes são uma série — cada um só começa a ser corrigido a partir do próprio
aniversário, então o acumulado cresce bem menos. A 5% ao ano por dez anos, o
valor único multiplica por **1,63**, enquanto a série equivale a **12,58 aportes
em vez de 10**. Usar 1,63 no acumulado inflaria o custo em 63% no lugar dos 26%
reais.

**Taxa zero:** a fórmula da série divide por zero. O limite é o próprio número de
aportes, e o código trata o caso explicitamente — ele aparece de verdade quando
alguém zera a taxa para comparar com o nominal.

### 6.2 O que muda e o que não muda na projeção

| Linha | Comportamento sob projeção |
|---|---|
| Aporte anual | **Não muda.** É o do 1º ano, o valor contratado hoje |
| Aporte acumulado | Cresce pelo fator de série |
| Valor de resgate | Cresce pelo fator de valor único |
| Custo sobre capital | **Cai** — o capital também é corrigido, e mais rápido que a série |
| Break-even | **Não se move** (ver ressalva abaixo) |

**Ressalva sobre o break-even projetado:** sob correção o break-even antecipa,
mas dizer em que ano exato exigiria a curva de resgate ano a ano, que não está
versionada. Por decisão, a linha continua sendo a do estudo oficial.

A projeção é uma **transformação dos números já apurados**, e não uma nova
cotação. Isso é deliberado: mantém a regressão contra os 719 estudos oficiais
intocada — ela continua conferindo o nominal, que é o que as seguradoras
assinam.

---

## 7. Modalidades: com e sem formação de reserva

O comparativo opera sobre **dois conjuntos de produtos que não se misturam**.

| Modalidade | Produtos | Linhas apresentadas |
|---|---|---|
| **Com resgate** | Icatu, MAG Integral, MetLife Vida Total, Prudential | Todas |
| **Sem resgate** | MAG Sucessão, MetLife Legado | Sem resgate e sem break-even |

**Por que são abas separadas, e não colunas do mesmo quadro:** produtos sem
formação de reserva saem substancialmente mais baratos porque não acumulam nada
— todo o aporte custeia a cobertura. Na mesma tabela, o mais barato venceria a
comparação por um motivo que não é vantagem, e sim outra natureza de produto. A
separação é uma decisão de integridade da apresentação, não de layout.

Nas modalidades sem reserva, as linhas de resgate e break-even são **omitidas do
documento**, e não zeradas: `R$ 0,00` num documento assinado lê-se como resgate
frustrado, e não como produto que nunca prometeu resgate.

---

## 8. Exemplo completo, ponta a ponta

**Perfil:** homem, 50 anos, capital segurado de R$ 1.000.000,00.
**Produto:** MAG Whole Life Integral 10 Anos.

### 8.1 Nominal

| Passo | Conta | Resultado |
|---|---|---|
| Tarifa versionada | `taxaAnualPor1mm` | 57.032,217573 |
| Prêmio líquido | `57.032,217573 × (1.000.000 ÷ 1.000.000)` | 57.032,217573 |
| Prêmio com IOF | `57.032,217573 × 1,0038` | **R$ 57.248,94** |
| Aporte acumulado | `57.248,94 × 10` | **R$ 572.489,40** |
| Custo vs capital | `(572.489,40 ÷ 1.000.000) × 100` | **57,2%** |
| Resgate no 10º ano | tabela de reservas do estudo | **R$ 574.354,16** |
| Break-even real | `574.354,16 ≥ 572.489,40` já no 10º ano | **10º ano** |

### 8.2 Comparativo completo (nominal)

| Seguradora | Aporte anual | Acumulado | Custo | Resgate 10º ano | Break-even |
|---|---:|---:|---:|---:|:---:|
| **MAG** | R$ 57.248,94 | R$ 572.489,40 | 57,2% | R$ 574.354,16 | 10º |
| MetLife | R$ 59.922,68 | R$ 599.226,80 | 59,9% | R$ 606.160,60 | 10º |
| Prudential | R$ 60.542,49 | R$ 605.424,90 | 60,5% | R$ 613.200,00 | 10º |
| Icatu | R$ 63.053,16 | R$ 630.531,60 | 63,1% | R$ 630.531,65 | 10º |

**Valor preservado:** `630.531,60 − 572.489,40` = **R$ 58.042,20** — a diferença
acumulada em 10 anos entre a opção recomendada e a de maior custo.

### 8.3 O mesmo caso, projetado a 5% ao ano

| Seguradora | Aporte anual (1º ano) | Acumulado | Custo | Resgate 10º ano |
|---|---:|---:|---:|---:|
| **MAG** | R$ 57.248,94 | R$ 720.071,02 | 44,2% | R$ 935.562,41 |
| MetLife | R$ 59.922,68 | R$ 753.701,03 | 46,3% | R$ 987.371,74 |
| Prudential | R$ 60.542,49 | R$ 761.496,93 | 46,7% | R$ 998.838,19 |
| Icatu | R$ 63.053,16 | R$ 793.075,87 | 48,7% | R$ 1.027.069,62 |

Conferência dos dois fatores neste caso:

- Acumulado: `57.248,94 × 12,577892536` = R$ 720.071,02
- Resgate: `574.354,16 × 1,628894627` = R$ 935.562,41
- Custo: `57,2% × 0,772173493` = 44,2%

O aporte anual permanece idêntico, o ranking não se altera, e o custo sobre o
capital **cai** — exatamente o comportamento descrito na seção 6.2.

---

## 9. Validação

### 9.1 Regressão contra os estudos oficiais

O sistema é conferido contra **719 casos reais** extraídos dos estudos emitidos
pelas seguradoras, com exigência de **igualdade ao centavo**. Não há tolerância
percentual: qualquer divergência de R$ 0,01 reprova a suíte.

| Seguradora | Casos no gabarito |
|---|---:|
| MAG | 259 |
| MetLife | 221 |
| Prudential | 123 |
| Icatu | 116 |
| **Total** | **719** |

Implementação em `tests/regressao.test.ts`. Cada caso registra o arquivo PDF de
origem, o que torna qualquer divergência rastreável até o documento da
seguradora.

### 9.2 Precisão das tarifas

As tarifas são gravadas com 6 casas decimais. A folga mínima até a fronteira de
arredondamento, nos casos que sofrem conversão de IOF, é de aproximadamente
**10.000 vezes** o erro introduzido pela normalização. A margem é confortável,
mas não é infinita: se a alíquota de IOF mudar, ou se surgir seguradora com
outra convenção de arredondamento, a validação precisa ser refeita
(`_analise/testar_motor.py`, que exige igualdade estrita).

### 9.3 Conferência dos fatores de indexação

Os três fatores de indexação conferem em calculadora financeira HP-12C e estão
travados por teste em `tests/indexacao.test.ts`. O documento em PDF é testado
sobre o HTML gerado, verificando que os números apurados chegam ao papel sem
recálculo intermediário.

---

## 10. Limitações e premissas assumidas

Todas conhecidas, todas deliberadas. O registro completo está em
[`PENDENCIAS.md`](./PENDENCIAS.md).

### 10.1 Que afetam números apresentados

| Limitação | Efeito |
|---|---|
| **Prêmio mensal = anual ÷ 12** | O mensal exibido fica **abaixo** do que o cliente pagaria. As seguradoras cobram mais no fracionamento — Prudential +5,96%, Icatu e MetLife entre +1,4% e +5,7%, MAG não publica |
| **Break-even fixo no 10º ano no PDF** | Acima de 55 anos o documento afirma um break-even que não se verifica (seção 5.1) |
| **Break-even derivado em duas linhas** | MetLife F/62 e Prudential M/33 tiveram o resgate derivado da curva canônica, que só cobre o período pós-quitação. Break-even = 10 ou nulo conforme o teste do 10º ano, não apurado ano a ano |
| **Um valor estimado na base** | MAG Sucessão homem 63 anos — sinalizado na interface |

### 10.2 Que restringem o escopo da cotação

| Limitação | Situação |
|---|---|
| **Prazo de aporte** | Apenas 10 anos. A Icatu oferece 5/10/15/20/25/30 e vitalício, não coletados |
| **Tabagismo** | Toda a base é não-fumante. O agravo por tabagismo não está modelado |
| **Coberturas adicionais** | Nenhuma cotada — apenas morte com vigência vitalícia |
| **Classes de risco** | Toda a base Prudential é `STANDARD`; classes preferenciais e agravadas não estão na base |

### 10.3 Premissas a confirmar

- **Idade** calculada como anos completos na data da simulação. Confere com os
  estudos (nascimento 01/01/1986, estudo em 14/01/2026 → 40 anos). Se alguma
  seguradora usar idade na próxima renovação, os valores mudam.
- **Linearidade do capital** validada apenas de forma indireta (seção 2.1).
- **Safra das tabelas** — a base mistura cotações de dez/2025 a jun/2026. Convém
  padronizar numa data única na próxima atualização.

### 10.4 Atualização das tabelas

As tabelas ficam versionadas no repositório. Quando uma seguradora reajusta,
alguém precisa rodar o pipeline e publicar. **Sem isso, uma tarifa desatualizada
gera proposta errada sem aviso.** Não há hoje nenhum mecanismo automático de
detecção — é a pendência de maior risco operacional da lista.

---

## Onde cada cálculo está implementado

| Etapa | Arquivo |
|---|---|
| Constantes de negócio (IOF, capital base, arredondamento) | `lib/dominio/regras.ts` |
| Fatores de indexação por IPCA | `lib/dominio/indexacao.ts` |
| Cotação do prêmio | `lib/motor/cotacao.ts` |
| Montagem do comparativo e break-even | `lib/motor/comparativo.ts` |
| Projeção por IPCA | `lib/motor/projecao.ts` |
| Leitura da base versionada | `lib/repositorio/repositorioJson.ts` |
| Regressão contra os 719 estudos | `tests/regressao.test.ts` |
