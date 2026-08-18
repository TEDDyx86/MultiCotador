# -*- coding: utf-8 -*-
"""
Testa formalmente a hipotese: apos a quitacao (ano 11 em diante), o valor de
resgate depende APENAS da idade atingida - nao da idade de entrada.

Se a hipotese vale, basta UMA curva por seguradora/sexo em vez de uma matriz
(idade de entrada x idade atingida).
"""
import glob, os, re, csv, collections, statistics
import pdfplumber

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.normpath(os.path.join(AQUI, '..', 'ESTUDOS POR IDADE'))

PRODUTOS = [
    ('ICATU',      'ICATU/HOMEM',       'ICATU_HORIZONTE_WL10',       'M'),
    ('ICATU',      'ICATU/MULHER',      'ICATU_HORIZONTE_WL10',       'F'),
    ('MAG',        'MAG/HOMEM_',        'MAG_WL_INTEGRAL_10',         'M'),
    ('MAG',        'MAG/MULHER',        'MAG_WL_INTEGRAL_10',         'F'),
    ('METLIFE',    'METLIFE/HOMEM_',    'METLIFE_VIDA_TOTAL_10',      'M'),
    ('METLIFE',    'METLIFE/MULHER',    'METLIFE_VIDA_TOTAL_10',      'F'),
    ('PRUDENTIAL', 'PRUDENTIAL/HOMEM',  'PRUDENTIAL_VIDA_INTEIRA_10', 'M'),
    ('PRUDENTIAL', 'PRUDENTIAL/MULHER', 'PRUDENTIAL_VIDA_INTEIRA_10', 'F'),
]

def n(s): return float(s.replace('.', '').replace(',', '.'))

def curva(seguradora, caminho):
    with pdfplumber.open(caminho) as pdf:
        texto = '\n'.join((p.extract_text() or '') for p in pdf.pages)
    out = {}
    for ln in texto.split('\n'):
        ln = ln.strip()
        m = None
        if seguradora == 'MAG':
            m = re.match(r'(\d+)\s+(\d+)\s+R\$\s*[\d\.,]+\s+R\$\s*[\d\.,]+\s+R\$\s*([\d\.,]+)', ln)
        elif seguradora == 'ICATU':
            m = re.match(r'(\d+)\s+(\d+)\s+[\d\.,]+\s+([\d\.,]+)\s+[\d\.,]+$', ln)
        elif seguradora == 'METLIFE':
            m = re.match(r'(\d+)\s+(\d+)\s+[\d\.,]+\s+([\d\.,]+)\s+(?:\d+A\s|VIDA INTEIRA)', ln)
        elif seguradora == 'PRUDENTIAL':
            m = re.match(r'Ano\s+(\d+)\s+\((\d+)\s+anos\)\s+[\d\.,]+\s+[\d\.,]+\s+([\d\.,]+)', ln)
        if m:
            ano, idade_atingida, resgate = int(m.group(1)), int(m.group(2)), n(m.group(3))
            if ano >= 10:                      # so o periodo pos-quitacao
                out[idade_atingida] = resgate
    return out

def idade(p):
    m = re.search(r'(\d{1,3})\s*ANOS?', os.path.basename(p), re.I)
    return int(m.group(1)) if m else None

linhas_saida = []
print(f'{"PRODUTO":28} {"S":2} {"pontos":>7} {"idades":>7}  divergencia entre idades de entrada')
for seguradora, pasta, produto, sexo in PRODUTOS:
    # idade_atingida -> {idade_entrada: resgate}
    mapa = collections.defaultdict(dict)
    for f in sorted(glob.glob(os.path.join(BASE, pasta, '*.pdf'))):
        ent = idade(f)
        if ent is None: continue
        for idade_at, resgate in curva(seguradora, f).items():
            if resgate > 0:
                mapa[idade_at][ent] = resgate

    divs, comparaveis = [], 0
    for idade_at, por_entrada in mapa.items():
        vals = list(por_entrada.values())
        if len(vals) < 2: continue
        comparaveis += 1
        divs.append((max(vals) - min(vals)) / max(vals) * 100)
    pior = max(divs) if divs else 0
    mediana = statistics.median(divs) if divs else 0
    veredito = 'CONFIRMADA' if pior < 0.01 else f'REJEITADA (pior {pior:.2f}%)'
    print(f'{produto:28} {sexo:2} {sum(len(v) for v in mapa.values()):>7} '
          f'{comparaveis:>7}  mediana {mediana:.4f}%  -> {veredito}')

    # curva canonica: usa a mediana quando ha divergencia
    for idade_at in sorted(mapa):
        vals = list(mapa[idade_at].values())
        linhas_saida.append({
            'produto': produto, 'sexo': sexo, 'idade_atingida': idade_at,
            'resgate_por_1mm': f'{statistics.median(vals):.2f}',
            'n_estudos': len(vals),
            'dispersao_pct': f'{((max(vals) - min(vals)) / max(vals) * 100):.4f}',
        })

saida = os.path.join(AQUI, 'curva_resgate_canonica.csv')
with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(linhas_saida[0].keys()), delimiter=';')
    w.writeheader(); w.writerows(linhas_saida)
print(f'\ncurva_resgate_canonica.csv: {len(linhas_saida)} linhas')
