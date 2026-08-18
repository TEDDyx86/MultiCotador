# -*- coding: utf-8 -*-
"""
Monta a TABELA MESTRE de tarifas do multicotador.

Regra de precedencia da fonte:
  1. PDF do estudo (fonte da verdade) -> premio anual SEM IOF, normalizado por R$ 1.000.000
  2. Planilha .xlsx, quando nao existe PDF -> remove o IOF quando a planilha o inclui
  3. Interpolacao geometrica entre as idades vizinhas -> marcada como ESTIMADO

Saida: tabela_mestre.csv  (taxa por R$ 1.000.000 de capital, sem IOF)
"""
import json, os, csv, re, collections, openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.normpath(os.path.join(AQUI, '..', 'ESTUDOS POR IDADE'))
IOF = 0.0038

MAPA = {
    ('ICATU', 'HOMEM'):             ('ICATU_HORIZONTE_WL10', 'M'),
    ('ICATU', 'MULHER'):            ('ICATU_HORIZONTE_WL10', 'F'),
    ('MAG', 'HOMEM_'):              ('MAG_WL_INTEGRAL_10', 'M'),
    ('MAG', 'MULHER'):              ('MAG_WL_INTEGRAL_10', 'F'),
    ('MAG', 'SUCESSÃO HOMEM'):      ('MAG_WL_SUCESSAO_10', 'M'),
    ('MAG', 'SUCESSÃO MULHER'):     ('MAG_WL_SUCESSAO_10', 'F'),
    ('METLIFE', 'HOMEM_'):          ('METLIFE_VIDA_TOTAL_10', 'M'),
    ('METLIFE', 'MULHER'):          ('METLIFE_VIDA_TOTAL_10', 'F'),
    ('METLIFE', 'SUCESSÃO HOMEM_'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'M'),
    ('METLIFE', 'SUCESSÃO MULHER'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'F'),
    ('PRUDENTIAL', 'HOMEM'):        ('PRUDENTIAL_VIDA_INTEIRA_10', 'M'),
    ('PRUDENTIAL', 'MULHER'):       ('PRUDENTIAL_VIDA_INTEIRA_10', 'F'),
}
# PDFs descartados: produto arquivado na pasta errada
DESCARTAR = {'MAG\\SUCESSÃO HOMEM\\MAG - HOMEM - 63 ANOS.pdf',
             'MAG/SUCESSÃO HOMEM/MAG - HOMEM - 63 ANOS.pdf'}

# Seguradoras cujo premio impresso no estudo JA CONTEM o IOF de 0,38%.
# Confirmado junto a MAG e Icatu: elas nao discriminam o IOF, ja o embutem no valor.
# MetLife e Prudential imprimem o premio liquido e somam o IOF a parte.
# A tabela mestre guarda sempre o valor LIQUIDO (sem IOF); o motor reaplica o IOF.
PREMIO_JA_COM_IOF = {'ICATU', 'MAG'}

# Planilha de apoio: (arquivo, aba, produto, sexo, valor_ja_inclui_iof)
# Todas as planilhas replicam o numero impresso no estudo, entao seguem a mesma regra.
PLANILHAS = [
    ('ICATU/SEGUROS POR IDADE ICATU.xlsx',            'HOMEM',  'ICATU_HORIZONTE_WL10',       'M', True),
    ('ICATU/SEGUROS POR IDADE ICATU.xlsx',            'MULHER', 'ICATU_HORIZONTE_WL10',       'F', True),
    ('MAG/SEGURO POR IDADE - MAG WL10.xlsx',          'HOMEM',  'MAG_WL_INTEGRAL_10',         'M', True),
    ('MAG/SEGURO POR IDADE - MAG WL10.xlsx',          'MULHER', 'MAG_WL_INTEGRAL_10',         'F', True),
    ('MAG/SEGURO POR IDADE MAG - SUCESSÃO.xlsx',      'HOMEM',  'MAG_WL_SUCESSAO_10',         'M', True),
    ('METLIFE/ESTUDOS POR IDADE METLIFE.xlsx',        'HOMEM',  'METLIFE_VIDA_TOTAL_10',      'M', True),
    ('METLIFE/ESTUDOS POR IDADE METLIFE.xlsx',        'MULHER', 'METLIFE_VIDA_TOTAL_10',      'F', True),
    ('PRUDENTIAL/ESTUDOS POR IDADE PRUDENTIAL .xlsx', 'HOMEM',  'PRUDENTIAL_VIDA_INTEIRA_10', 'M', True),
    ('PRUDENTIAL/ESTUDOS POR IDADE PRUDENTIAL .xlsx', 'MULHER', 'PRUDENTIAL_VIDA_INTEIRA_10', 'F', True),
]

# Faixa etaria oficial de cada produto (o que a base cobre de ponta a ponta)
FAIXA = {
    'ICATU_HORIZONTE_WL10':       (18, 75),
    'MAG_WL_INTEGRAL_10':         (16, 80),
    'MAG_WL_SUCESSAO_10':         (16, 80),
    'METLIFE_VIDA_TOTAL_10':      (18, 75),
    'METLIFE_VIDA_TOTAL_LEGADO_10': (18, 70),
    'PRUDENTIAL_VIDA_INTEIRA_10': (14, 75),
}


def num(v):
    if v is None: return None
    if isinstance(v, (int, float)): return round(float(v), 2)
    s = str(v).replace('R$', '').strip().replace('.', '').replace(',', '.')
    try: return round(float(s), 2)
    except ValueError: return None


# ---------- 1. PDFs ----------
tab = collections.defaultdict(dict)   # (produto, sexo) -> idade -> registro
pdfs = json.load(open(os.path.join(AQUI, 'extraido.json'), encoding='utf-8'))
for x in pdfs:
    chave = (x['seguradora'], x['grupo'])
    if chave not in MAPA or x['arquivo'] in DESCARTAR:
        continue
    produto, sexo = MAPA[chave]
    lo, hi = FAIXA[produto]
    idade = x['idade_arquivo']
    if not (lo <= idade <= hi):
        continue
    anual, capital = x.get('anual'), x.get('capital')
    if not anual or not capital:
        continue
    if x['seguradora'] in PREMIO_JA_COM_IOF:
        anual = anual / (1 + IOF)   # normaliza para premio liquido
    tab[(produto, sexo)][idade] = {
        'taxa_1mm': round(anual / capital * 1_000_000, 6),
        'fonte': 'PDF',
        'origem': x['arquivo'],
        'capital_max': capital if capital < 1_000_000 else None,
    }

# ---------- 2. Planilhas (so preenchem buraco) ----------
cache = {}
def ler(arq):
    if arq not in cache:
        wb = openpyxl.load_workbook(os.path.join(BASE, arq), data_only=True)
        d = {}
        for ws in wb.worksheets:
            aba = {}
            for row in ws.iter_rows(values_only=True):
                if not row or row[0] is None: continue
                m = re.match(r'\s*(\d{1,3})\s*ANOS', str(row[0]), re.I)
                if m and num(row[-1]) is not None:
                    aba[int(m.group(1))] = num(row[-1])
            d[ws.title.strip().upper()] = aba
        cache[arq] = d
    return cache[arq]

for arq, aba, produto, sexo, tem_iof in PLANILHAS:
    dados = ler(arq).get(aba.upper(), {})
    lo, hi = FAIXA[produto]
    for idade, valor in dados.items():
        if not (lo <= idade <= hi) or idade in tab[(produto, sexo)]:
            continue
        taxa = valor / (1 + IOF) if tem_iof else valor
        tab[(produto, sexo)][idade] = {
            'taxa_1mm': round(taxa, 6), 'fonte': 'XLSX',
            'origem': f'{arq}#{aba}', 'capital_max': None,
        }

# ---------- 3. Interpolacao geometrica ----------
for chave, por_idade in tab.items():
    lo, hi = FAIXA[chave[0]]
    for idade in range(lo, hi + 1):
        if idade in por_idade: continue
        ant = max((i for i in por_idade if i < idade), default=None)
        pos = min((i for i in por_idade if i > idade), default=None)
        if ant is None or pos is None: continue
        a, b = por_idade[ant]['taxa_1mm'], por_idade[pos]['taxa_1mm']
        peso = (idade - ant) / (pos - ant)
        por_idade[idade] = {
            'taxa_1mm': round(a * (b / a) ** peso, 6), 'fonte': 'ESTIMADO',
            'origem': f'interpolacao geometrica {ant}<->{pos}', 'capital_max': None,
        }

# ---------- saida ----------
linhas = []
for (produto, sexo), por_idade in sorted(tab.items()):
    for idade in sorted(por_idade):
        r = por_idade[idade]
        linhas.append({
            'produto': produto, 'sexo': sexo, 'idade': idade,
            'taxa_anual_por_1mm': f"{r['taxa_1mm']:.6f}",
            'capital_max': f"{r['capital_max']:.0f}" if r['capital_max'] else '',
            'fonte': r['fonte'], 'origem': r['origem'],
        })
saida = os.path.join(AQUI, 'tabela_mestre.csv')
with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(linhas[0].keys()), delimiter=';')
    w.writeheader(); w.writerows(linhas)

print('tabela_mestre.csv:', len(linhas), 'linhas\n')
print(f'{"PRODUTO":30} {"S":2} {"FAIXA":8} {"N":>3}  PDF XLSX EST  LACUNAS')
for (produto, sexo), por_idade in sorted(tab.items()):
    lo, hi = FAIXA[produto]
    c = collections.Counter(r['fonte'] for r in por_idade.values())
    faltam = [i for i in range(lo, hi + 1) if i not in por_idade]
    print(f'{produto:30} {sexo:2} {lo}-{hi:<5} {len(por_idade):>3}  '
          f'{c["PDF"]:>3} {c["XLSX"]:>4} {c["ESTIMADO"]:>3}  {faltam or "nenhuma"}')

print('\n--- linhas NAO vindas de PDF ---')
for r in linhas:
    if r['fonte'] != 'PDF':
        print(f'  {r["produto"]:30} {r["sexo"]} {r["idade"]:>3} anos -> '
              f'{r["taxa_anual_por_1mm"]:>10}  [{r["fonte"]}] {r["origem"]}')

print('\n--- verificacao de monotonicidade da tabela mestre ---')
problemas = 0
for (produto, sexo), por_idade in sorted(tab.items()):
    idades = sorted(por_idade)
    for a, b in zip(idades, idades[1:]):
        if por_idade[b]['taxa_1mm'] <= por_idade[a]['taxa_1mm']:
            print(f'  {produto} {sexo} {a}->{b}: '
                  f'{por_idade[a]["taxa_1mm"]:.2f} -> {por_idade[b]["taxa_1mm"]:.2f}')
            problemas += 1
print(f'  total de quebras: {problemas}')
