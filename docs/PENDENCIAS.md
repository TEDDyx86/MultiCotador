# Pendências e decisões adiadas

Registro do que ficou de fora do MVP por decisão consciente, e do que precisa de
confirmação externa. Revisar antes de cada nova fase.

Última atualização: 2026-08-18

---

## 1. Decisões adiadas ("vamos ver depois")

### 1.1 Atualização das tabelas de tarifa
**Situação:** as tabelas ficam versionadas no repositório. Quando uma seguradora reajusta,
alguém precisa rodar o pipeline e publicar.

**Opções levantadas na conversa:**
- Tela de administração com upload dos PDFs novos, processados pelo pipeline existente
- Importação de planilha (descartada como preferência — foi assim que surgiu o erro da
  planilha MAG Sucessão)
- Manutenção manual via repositório (situação atual)

**Por que importa:** sem isso, uma tarifa desatualizada gera proposta errada sem aviso.
Sugestão mínima: exibir a data da safra na tela e no PDF.

### 1.2 Prazos de aporte além de 10 anos
**Situação:** só existe a tabela de 10 anos. A Icatu oferece 5/10/15/20/25/30 e vitalício.

**Método já validado:** cotar **âncoras a cada 5 anos** (18, 20, 25… 75, 80 = 14 idades por
prazo/sexo/produto) e interpolar geometricamente o restante. Erro medido na base atual:
médio 0,19%, p95 0,88%, máximo 2,59%. Reduz a coleta de 65 para 14 cotações.

**Antes de coletar:** definir quais prazos realmente vendem. Mapear os 7 da Icatu quando
5 nunca saem seria desperdício.

### 1.3 Prêmio mensal
**Situação:** o sistema calcula `anual ÷ 12`, por decisão do usuário.

**O que a base mostra:** as seguradoras cobram **mais** que isso no fracionamento.
A Prudential cobra exatamente **+5,96%** (fator constante em todas as idades, já extraído).
Icatu e MetLife variam por idade, entre 1,014 e 1,057. A MAG não publica valor mensal.

**Consequência:** o mensal exibido fica abaixo do que o cliente pagaria de fato. Corrigir
exige apenas trocar a fórmula pelo fator — o dado da Prudential já está levantado.

### 1.4 Fumante
Toda a base é não-fumante. O agravo por tabagismo é um dos mais relevantes do produto e
não temos nenhum dado. Ignorado por decisão.

### 1.5 Coberturas adicionais
Nenhuma foi cotada (doenças graves, invalidez, diárias de internação, incapacidade
temporária). O sistema cota apenas morte com vigência vitalícia.

### 1.6 Classes de risco da Prudential
Toda a base é `STANDARD`. Existem classes preferenciais (mais baratas) e agravadas.
Relevância baixa: a classe só é conhecida após a análise de risco, e cotar STANDARD é o
que o corretor já faz na ponta de venda.

### 1.7 Histórico de cotações
Decidido não guardar. Cada cotação é descartável. Se um dia entrar, exige banco de
escrita — o modelo de dados já está desenhado para essa troca.

---

## 2. Break-even fixo no 10º ano

**Decisão:** o PDF apresenta sempre "10º ano". A tela mostra o valor real calculado.

**O que a análise dos 484 estudos mostrou:**

| Faixa | Break-even é 10 | Resgate no 10º ano vs aportado |
|---|---|---|
| 30–50 anos | 74,3% dos casos | mínimo **100,0%** |
| 30–55 anos | 69,6% | mínimo 97,3% |
| Base inteira | 49,2% | mínimo 29,3% |

Na faixa de venda a fixação é correta — quando erra, erra para menos (a MAG faz
break-even no 9º ano). **Acima de 55 anos degrada:** aos 65 o cliente tem 86–89% do
aportado; aos 70, cerca de 77%. Em 112 combinações o resgate nunca alcança o aportado.

**Risco assumido:** para clientes acima de 55 anos, o documento afirma um break-even que
não se verifica. O corretor vê o número real na tela e decide como conduzir.

---

## 3. Pendências de dados

| Item | Situação | Ação |
|---|---|---|
| MAG Sucessão homem 63 anos | Único valor `ESTIMADO` da base. O PDF arquivado é do produto Integral, não Sucessão | Recotar na MAG |
| MetLife Legado mulher 44–47 | Quatro idades com prêmio idêntico (R$ 34.647,83), mesma data de cotação | Confirmar com a MetLife |
| MetLife Vida Total 69→70 | Prêmio **cai** entre essas idades, na mesma data de cotação | Confirmar com a MetLife |
| MetLife Vida Total mulher 62 | Sem PDF; tarifa veio da planilha e o resgate foi derivado da curva canônica | Recotar quando conveniente |
| Prudential homem 33 | Idem | Recotar quando conveniente |
| Planilha MAG Sucessão | Só tem aba HOMEM, preenchida até 40 anos, com valor do produto errado na linha 41 | Descartar — os PDFs cobrem tudo |
| Pasta `MAG/H 12.05.2026` | Reemissão do estudo de `MAG/HOMEM_`: prêmios idênticos, só as reservas mudam | Não é produto novo; manter fora da base |
| Logo Blue3 | 240×240 px com fundo sólido, sem transparência | Pedir SVG ou PNG maior para melhorar a impressão |

---

## 4. Limitações conhecidas do que já está construído

### 4.1 Break-even derivado nas duas linhas sem PDF
Para MetLife F/62 e Prudential M/33 o valor de resgate foi derivado da curva
canônica, que só cobre o período **pós-quitação** (ano 10 em diante). Dá para afirmar
se o resgate já alcançou o aportado no 10º ano, mas não em que ano exato isso ocorreu
quando foi antes. As duas linhas trazem `breakeven = 10` ou `null` conforme o teste do
10º ano, e não um valor apurado ano a ano como as demais.

Sem efeito no documento final, que apresenta sempre o 10º ano. Afeta apenas a
informação interna do corretor nessas duas combinações.

### 4.2 Precisão das tarifas
As tarifas são gravadas com 6 casas decimais. A folga mínima até a fronteira de
arredondamento, nos casos que sofrem conversão de IOF, é de aproximadamente 10.000×
o erro introduzido. Se um dia a alíquota de IOF mudar ou surgirem seguradoras com
outra convenção de arredondamento, revalidar rodando `_analise/testar_motor.py`, que
agora exige igualdade estrita.

## 5. Premissas a confirmar

- **Idade** calculada como anos completos na data da simulação. Confere com os estudos
  (nascimento 01/01/1986, estudo em 14/01/2026 → 40 anos). Se alguma seguradora usar
  idade na próxima renovação, os valores mudam.
- **Linearidade do capital** — o prêmio escala proporcionalmente, sem taxa fixa de apólice.
  Validado indiretamente pelas cotações de R$ 700 mil da MAG, que caem exatamente sobre a
  curva normalizada. Confirmar limites mínimo e máximo de capital por seguradora.
- **Safra das tabelas** — a base mistura cotações de dez/2025 a jun/2026. Convém
  padronizar numa data única na próxima atualização.
