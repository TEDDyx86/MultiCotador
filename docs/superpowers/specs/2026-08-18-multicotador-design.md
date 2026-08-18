# Multicotador de Seguros de Vida — Design

**Data:** 2026-08-18
**Status:** aguardando aprovação

## Problema

Hoje o comparativo entre seguradoras é montado à mão, a partir de estudos em PDF gerados
um a um em cada portal. Cada cotação exige abrir quatro portais, extrair valores e
remontar o documento. O resultado é lento e vulnerável a erro de transcrição — a análise
da base encontrou uma planilha com valores do produto errado copiados para outro.

O sistema substitui esse processo: o corretor informa o perfil do cliente e recebe o
comparativo pronto, no mesmo formato que já entrega hoje.

## Escopo

**Dentro:**
- Cotação dos 6 produtos Whole Life com aporte em 10 anos e vigência vitalícia
- Comparativo em PDF de uma página, fiel ao modelo `Comparativo-WholeLife-JohnDaniel.pdf`
- Tela de operação com tema visual próprio

**Distinção importante:** a tela cota os **6 produtos** (inclui os sucessórios MAG Sucessão
e MetLife Legado, que costumam ser bem mais baratos e interessam ao corretor). O PDF
comparativo usa apenas os **4 produtos com valor de resgate**, porque duas de suas linhas
— break-even e resgate no 10º ano — não existem nos sucessórios.

**Fora (decidido explicitamente):**
- Histórico de cotações — cada cotação é descartável
- Tela de administração para atualizar tarifas — as tabelas ficam versionadas no repositório
- Prazos de aporte diferentes de 10 anos
- Coberturas adicionais (doenças graves, invalidez, diárias)
- Agravo por tabagismo e classes de risco não-standard

## Usuários

Ferramenta interna: o corretor e sua equipe. Sem multi-tenant, sem captura de lead.

Proteção de acesso: middleware verificando uma senha compartilhada em variável de
ambiente. Suficiente para o uso interno e não bloqueia o deploy.

## Arquitetura

```
app/
  page.tsx                    formulário + resultado
  api/comparativo/route.ts    gera o PDF
lib/
  dominio/                    tipos e regras de negócio (puro, sem I/O)
  motor/                      cálculo — porte TS de _analise/motor.py
  repositorio/                interface + implementação sobre dados versionados
dados/
  tarifas.json                722 tarifas
  resgates.json               484 linhas de break-even e resgate
  produtos.json               metadados dos 6 produtos
templates/
  comparativo.tsx             HTML+CSS do PDF
pipeline/                     scripts Python — não vai a produção
```

**Regra de dependência:** `dominio` não depende de nada. `motor` depende de `dominio`.
`app` depende de `motor` e `repositorio`. O motor não sabe de onde vêm os dados nem que
existe PDF — recebe o repositório por parâmetro e devolve valores.

Isso permite testar o motor isolado contra os 719 casos de referência.

## Modelo de dados

O modelo é definido formalmente e escondido atrás de uma interface de repositório. A
implementação inicial lê JSON versionado; trocar por Postgres no futuro não toca o motor.

### Seguradora
| Campo | Tipo | Nota |
|---|---|---|
| id | string | `MAG`, `ICATU`, `METLIFE`, `PRUDENTIAL` |
| nome | string | exibição |
| logo | string | caminho do PNG |

### Produto
| Campo | Tipo | Nota |
|---|---|---|
| id | string | `MAG_WL_INTEGRAL_10` |
| seguradoraId | string | |
| nome | string | nome comercial |
| codigoSusep | string? | só MAG tem (3109, 3115) |
| anosPagamento | number | 10 |
| vigencia | string | `VITALICIA` |
| idadeMin / idadeMax | number | faixa da base |
| temResgate | boolean | falso nos sucessórios |
| premioJaComIof | boolean | verdadeiro em MAG e Icatu |
| entraNoComparativo | boolean | os 4 com resgate |

### Tarifa (722 registros)
| Campo | Tipo | Nota |
|---|---|---|
| produtoId, sexo, idade | chave composta | |
| taxaAnualPor1mm | decimal | **prêmio líquido**, sem IOF |
| capitalMax | decimal? | 700.000 na MAG Sucessão 78+ |
| fonte | enum | `PDF`, `XLSX`, `ESTIMADO` |
| origem | string | arquivo de onde saiu |

### Resgate (484 registros)
| Campo | Tipo | Nota |
|---|---|---|
| produtoId, sexo, idadeEntrada | chave composta | |
| breakevenReal | number? | nulo = nunca alcança |
| resgate10aPor1mm | decimal | |

### CurvaCanonica (594 registros)
Reserva por idade atingida. Não usada no MVP; preservada para projeções futuras.

### Safra
Versão da base, com data de vigência. A base inicial mistura cotações de dez/2025 a
jun/2026 — registrar isso é o que permitirá auditar mudanças depois.

## Regras de negócio

Vivem em `lib/dominio`, não na UI.

1. **Idade** = anos completos na data da simulação, derivada da data de nascimento.
2. **Prêmio** = `taxaAnualPor1mm × capital ÷ 1.000.000`. Linear, sem taxa fixa.
   Aceita qualquer capital, inclusive acima de R$ 1MM e com centavos.
3. **IOF** de 0,38% aplicado uniformemente na saída. A base guarda sempre o valor
   líquido; MAG e Icatu têm o IOF removido na ingestão porque seus estudos já o embutem.
4. **Mensal** = anual ÷ 12.
5. **Elegibilidade** — produto indisponível fora da faixa etária.
6. **Teto de capital** — MAG Sucessão aceita no máximo R$ 700 mil a partir dos 78 anos.
7. **Break-even** — o PDF apresenta sempre "10º ano", fixo. A tela exibe o valor real
   calculado, para informação do corretor.
8. **Produtos sem resgate** — MAG Sucessão e MetLife Legado não entram no comparativo
   (não têm valor de resgate, só benefício prolongado).

Usar `Decimal` (não float) em toda aritmética monetária.

## Fluxo

1. Corretor preenche o formulário
2. `motor.comparativo(sexo, idade, capital)` devolve as 4 linhas ordenadas por aporte
3. Tela renderiza ranking, tabela detalhada e avisos
4. Ao acionar "Gerar PDF", a rota de API renderiza o template e devolve o arquivo

Cálculo é síncrono e local — sem rede, sem banco. A única operação lenta é o PDF.

## Campos do formulário

**Afetam o cálculo:** sexo, data de nascimento, capital segurado.

**Aparecem no documento:** nome completo, estado civil, regime de bens (só quando
casado), profissão, número de herdeiros, renda mensal.

## Interface

Tema cofre/segurança, dentro da paleta do comparativo.

| Uso | Cor |
|---|---|
| Fundo profundo | `#0A1A33` |
| Placa metálica | `#132844` → `#1C3557` |
| Acento | `#22A7F0` |
| Texto | `#E8EEF7` / `#8FA3BF` |

- Header escuro com `header-pattern.png` em baixa opacidade, logo RT branca
- Painel de entrada como placa de cofre: relevo interno nos campos, cantos chanfrados
- Botão de calcular com anel que gira três quartos de volta ao processar
- Ranking revela em cascata, 1º colocado com halo ciano
- Valores com contagem animada
- `prefers-reduced-motion` degrada tudo para fade

**Três estados que o PDF não prevê e a tela precisa mostrar:**
- Produto inelegível, com o motivo
- Teto de capital atingido
- Break-even real quando o resgate não alcança o aportado

## PDF

Fiel ao modelo: uma página A4, sete blocos na mesma ordem, mesma paleta.

- Header `#001A62` com logo Blue3 + XP
- Rodapé com assinatura RT e `@ROBSONTAVERNARD | @BLUE3INVESTIMENTOS`
- Fontes **TeX Gyre Heros** e **DejaVu Serif Italic**, embutidas no projeto — sem isso
  o Chromium da Vercel substitui e o layout escorrega
- Logos das quatro seguradoras nos cards do ranking

Geração por `puppeteer-core` + `@sparticuz/chromium`. O Puppeteer completo não cabe no
limite de 250MB da função serverless. Cold start de 2 a 5s; requer plano Vercel Pro para
folga de timeout.

## Testes

**Regressão do motor (o mais importante):** os 719 casos extraídos dos PDFs, comparados
com centavo exato. O porte de Python para TypeScript é o maior risco do projeto — um
arredondamento ou ordem de operação diferente passaria despercebido sem isso.

**Comparativo de referência:** o caso John Daniel (homem, 50 anos, R$ 1MM) conferido
campo a campo contra o PDF original, incluindo o valor preservado de R$ 58.042,20.

**Regras de negócio:** linearidade do capital, teto da MAG Sucessão, elegibilidade nas
bordas etárias, idade derivada da data de nascimento.

**PDF:** teste de fumaça — gera e verifica que saiu uma página com os valores corretos.

## Riscos

| Risco | Mitigação |
|---|---|
| Erro no porte TS | Teste de regressão dos 719 casos |
| Puppeteer estourar timeout | Vercel Pro; alternativa conhecida é `@react-pdf/renderer` |
| Tarifa desatualizada | Campo `safra` visível; atualização entra em fase posterior |
| Linha estimada citada como real | Campo `fonte` propagado até a interface |

## Pendências conhecidas da base

Não bloqueiam o desenvolvimento, mas ficam registradas:

- MAG Sucessão homem 63 anos é a única tarifa `ESTIMADO` — o PDF arquivado é do produto
  errado. Recotar.
- MetLife Legado mulher: 44 a 47 anos com prêmio idêntico. Confirmar com a seguradora.
- MetLife Vida Total: prêmio cai de 69 para 70 anos. Confirmar.
- Logo Blue3 em 240×240 com fundo sólido. Um SVG melhoraria a impressão.
