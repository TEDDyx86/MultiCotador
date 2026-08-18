# -*- coding: utf-8 -*-
"""Extrai a tabela de valor de resgate ano a ano e testa se a reserva pos-quitacao
depende apenas da idade atingida (e nao da idade de entrada)."""
import glob, os, re, sys
import pdfplumber

BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ESTUDOS POR IDADE'))

def n(s):
    return float(s.replace('.', '').replace(',', '.'))

def texto(f):
    with pdfplumber.open(f) as pdf:
        return '\n'.join((p.extract_text() or '') for p in pdf.pages)

def reservas(seguradora, f):
    """-> {idade_atingida: valor_resgate}"""
    t, d = texto(f), {}
    for ln in t.split('\n'):
        ln = ln.strip()
        if seguradora == 'MAG':
            # ano idade R$ contrib R$ capital R$ reserva ...
            m = re.match(r'(\d+)\s+(\d+)\s+R\$\s*([\d\.,]+)\s+R\$\s*([\d\.,]+)\s+R\$\s*([\d\.,]+)', ln)
            if m: d[int(m.group(2))] = n(m.group(5))
        elif seguradora == 'ICATU':
            # ano idade pagamentos resgate indenizacao
            m = re.match(r'(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)$', ln)
            if m: d[int(m.group(2))] = n(m.group(4))
        elif seguradora == 'METLIFE':
            # ano idade premio resgate beneficio_prolongado saldado
            m = re.match(r'(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(?:\d+A\s|VIDA INTEIRA)', ln)
            if m: d[int(m.group(2))] = n(m.group(4))
        elif seguradora == 'PRUDENTIAL':
            # Ano N (I anos) capital quitado resgate saldado ...
            m = re.match(r'Ano\s+\d+\s+\((\d+)\s+anos\)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)', ln)
            if m: d[int(m.group(1))] = n(m.group(4))
    return d

PASTAS = {
    'MAG': 'MAG/HOMEM_', 'ICATU': 'ICATU/HOMEM',
    'METLIFE': 'METLIFE/HOMEM_', 'PRUDENTIAL': 'PRUDENTIAL/HOMEM',
}
ENTRADAS = [30, 40, 50, 60]

for seg, pasta in PASTAS.items():
    curvas = {}
    for ent in ENTRADAS:
        cands = [f for f in glob.glob(os.path.join(BASE, pasta, '*.pdf'))
                 if re.search(rf'(?<!\d){ent}\s*ANOS', os.path.basename(f), re.I)]
        if not cands: continue
        curvas[ent] = reservas(seg, cands[0])
    print('=' * 78)
    print(f'{seg}  (homem, capital R$ 1.000.000)   linhas extraidas: '
          + ', '.join(f'{e}anos={len(c)}' for e, c in curvas.items()))
    idades = [62, 65, 70, 75, 80, 90]
    print(f'{"idade":>6}' + ''.join(f'{"entra " + str(e):>15}' for e in curvas))
    for i in idades:
        vals = [curvas[e].get(i) for e in curvas]
        linha = f'{i:>6}'
        for v in vals:
            linha += f'{v:>15,.2f}' if v is not None else f'{"-":>15}'
        presentes = [v for v in vals if v]
        if len(presentes) > 1:
            espalhamento = (max(presentes) - min(presentes)) / max(presentes) * 100
            linha += f'   dif={espalhamento:.2f}%'
        print(linha)
