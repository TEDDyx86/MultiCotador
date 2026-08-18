# -*- coding: utf-8 -*-
"""Cruza os premios extraidos dos PDFs com as planilhas xlsx."""
import json, os, re, openpyxl

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BASE = os.path.join(RAIZ, 'ESTUDOS POR IDADE')

def num(v):
    if v is None: return None
    if isinstance(v, (int, float)): return round(float(v), 2)
    s = str(v).replace('R$', '').strip().replace('.', '').replace(',', '.')
    try: return round(float(s), 2)
    except ValueError: return None

def ler_planilha(caminho):
    wb = openpyxl.load_workbook(caminho, data_only=True)
    dados = {}
    for ws in wb.worksheets:
        aba = {}
        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None: continue
            m = re.match(r'\s*(\d{1,3})\s*ANOS', str(row[0]), re.I)
            if not m: continue
            aba[int(m.group(1))] = num(row[-1])
        dados[ws.title.strip()] = aba
    return dados

PLANILHAS = {
    ('ICATU', 'HOMEM'):            ('ICATU/SEGUROS POR IDADE ICATU.xlsx', 'HOMEM'),
    ('ICATU', 'MULHER'):           ('ICATU/SEGUROS POR IDADE ICATU.xlsx', 'MULHER'),
    ('MAG', 'HOMEM_'):             ('MAG/SEGURO POR IDADE - MAG WL10.xlsx', 'HOMEM'),
    ('MAG', 'MULHER'):             ('MAG/SEGURO POR IDADE - MAG WL10.xlsx', 'MULHER'),
    ('MAG', 'H 12.05.2026'):       ('MAG/SEGURO POR IDADE - MAG WL10.xlsx', 'HOMEM'),
    ('MAG', 'SUCESSÃO HOMEM'):     ('MAG/SEGURO POR IDADE MAG - SUCESSÃO.xlsx', 'HOMEM'),
    ('MAG', 'SUCESSÃO MULHER'):    ('MAG/SEGURO POR IDADE MAG - SUCESSÃO.xlsx', 'MULHER'),
    ('METLIFE', 'HOMEM_'):         ('METLIFE/ESTUDOS POR IDADE METLIFE.xlsx', 'HOMEM'),
    ('METLIFE', 'MULHER'):         ('METLIFE/ESTUDOS POR IDADE METLIFE.xlsx', 'MULHER'),
    ('PRUDENTIAL', 'HOMEM'):       ('PRUDENTIAL/ESTUDOS POR IDADE PRUDENTIAL .xlsx', 'HOMEM'),
    ('PRUDENTIAL', 'MULHER'):      ('PRUDENTIAL/ESTUDOS POR IDADE PRUDENTIAL .xlsx', 'MULHER'),
}

cache = {}
def planilha(arq):
    if arq not in cache:
        cache[arq] = ler_planilha(os.path.join(BASE, arq))
    return cache[arq]

pdfs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extraido.json'), encoding='utf-8'))
por_grupo = {}
for x in pdfs:
    por_grupo.setdefault((x['seguradora'], x['grupo']), {})[x['idade_arquivo']] = x

for chave, (arq, aba) in PLANILHAS.items():
    xl = planilha(arq)
    if aba not in xl:
        cand = [k for k in xl if k.strip().upper().startswith(aba[:5])]
        if not cand:
            print(f'{chave[0]:11} {chave[1]:16} SEM ABA "{aba}" na planilha {arq} -> so existem {list(xl)}')
            continue
        aba = cand[0]
    tab = {k: v for k, v in xl[aba].items() if v is not None}
    pdfd = por_grupo.get(chave, {})
    idades = sorted(set(tab) | set(pdfd))
    ok = div = so_xl = so_pdf = 0
    detalhes = []
    for i in idades:
        v_xl = tab.get(i)
        p = pdfd.get(i)
        v_pdf = p.get('anual') if p else None
        if v_xl is None and v_pdf is not None: so_pdf += 1; continue
        if v_pdf is None and v_xl is not None: so_xl += 1; detalhes.append((i, v_xl, None)); continue
        if v_xl is None: continue
        if abs(v_xl - v_pdf) < 0.02: ok += 1
        else:
            div += 1
            detalhes.append((i, v_xl, v_pdf))
    print(f'{chave[0]:11} {chave[1]:16} planilha={len(tab):3} pdfs={len(pdfd):3} | iguais={ok:3} divergentes={div:3} so_xlsx={so_xl:2} so_pdf={so_pdf:2}')
    for i, a, b in detalhes[:8]:
        dif = '' if b is None else f'  dif={round(a-b,2):+}'
        print(f'      idade {i:3}: xlsx={a} pdf={b}{dif}')
