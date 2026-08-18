# -*- coding: utf-8 -*-
"""
Extrai a curva de valor de resgate ano a ano de todos os estudos dos 4 produtos
que possuem resgate, e responde duas perguntas:

  1. O break-even (1o ano em que o resgate >= aportes acumulados) e sempre o 10o ano?
  2. O valor de resgate no 10o ano pode ser calculado / tabelado?
"""
import glob, json, os, re, csv, collections
import pdfplumber

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.normpath(os.path.join(AQUI, '..', 'ESTUDOS POR IDADE'))
IOF = 0.0038

# Somente os produtos que possuem valor de resgate.
# MAG Sucessao e MetLife Legado NAO tem resgate (so beneficio prolongado).
PRODUTOS = [
    ('ICATU',      'ICATU/HOMEM',      'ICATU_HORIZONTE_WL10',       'M'),
    ('ICATU',      'ICATU/MULHER',     'ICATU_HORIZONTE_WL10',       'F'),
    ('MAG',        'MAG/HOMEM_',       'MAG_WL_INTEGRAL_10',         'M'),
    ('MAG',        'MAG/MULHER',       'MAG_WL_INTEGRAL_10',         'F'),
    ('METLIFE',    'METLIFE/HOMEM_',   'METLIFE_VIDA_TOTAL_10',      'M'),
    ('METLIFE',    'METLIFE/MULHER',   'METLIFE_VIDA_TOTAL_10',      'F'),
    ('PRUDENTIAL', 'PRUDENTIAL/HOMEM', 'PRUDENTIAL_VIDA_INTEIRA_10', 'M'),
    ('PRUDENTIAL', 'PRUDENTIAL/MULHER','PRUDENTIAL_VIDA_INTEIRA_10', 'F'),
]


def n(s):
    return float(s.replace('.', '').replace(',', '.'))


def linhas_do_pdf(seguradora, caminho):
    """-> {ano_vigencia: (idade_atingida, aportes_acumulados, valor_resgate)}"""
    with pdfplumber.open(caminho) as pdf:
        texto = '\n'.join((p.extract_text() or '') for p in pdf.pages)
    out = {}
    for ln in texto.split('\n'):
        ln = ln.strip()
        if seguradora == 'MAG':
            m = re.match(r'(\d+)\s+(\d+)\s+R\$\s*([\d\.,]+)\s+R\$\s*[\d\.,]+\s+R\$\s*([\d\.,]+)', ln)
        elif seguradora == 'ICATU':
            m = re.match(r'(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+[\d\.,]+$', ln)
        elif seguradora == 'METLIFE':
            m = re.match(r'(\d+)\s+(\d+)\s+([\d\.,]+)\s+([\d\.,]+)\s+(?:\d+A\s|VIDA INTEIRA)', ln)
        elif seguradora == 'PRUDENTIAL':
            m = re.match(r'Ano\s+(\d+)\s+\((\d+)\s+anos\)\s+[\d\.,]+\s+([\d\.,]+)\s+([\d\.,]+)', ln)
        if m:
            out[int(m.group(1))] = (int(m.group(2)), n(m.group(3)), n(m.group(4)))
    return out


def idade_do_nome(p):
    m = re.search(r'(\d{1,3})\s*ANOS?', os.path.basename(p), re.I)
    return int(m.group(1)) if m else None


registros = []
for seguradora, pasta, produto, sexo in PRODUTOS:
    for f in sorted(glob.glob(os.path.join(BASE, pasta, '*.pdf'))):
        idade = idade_do_nome(f)
        if idade is None:
            continue
        curva = linhas_do_pdf(seguradora, f)
        if not curva:
            continue
        # aportes acumulados no PDF ja vem na base "que o cliente paga"
        breakeven = None
        for ano in sorted(curva):
            _, aportes, resgate = curva[ano]
            if aportes > 0 and resgate >= aportes:
                breakeven = ano
                break
        ano10 = curva.get(10)
        registros.append({
            'produto': produto, 'sexo': sexo, 'idade_entrada': idade,
            'breakeven': breakeven, 'anos_extraidos': len(curva),
            'ultimo_ano': max(curva), 'tem_resgate': any(v[2] > 0 for v in curva.values()),
            'idade_ano10': ano10[0] if ano10 else None,
            'aportes_10a': ano10[1] if ano10 else None,
            'resgate_10a': ano10[2] if ano10 else None,
            'arquivo': os.path.relpath(f, BASE),
        })

with open(os.path.join(AQUI, 'curvas_resgate.json'), 'w', encoding='utf-8') as fh:
    json.dump(registros, fh, ensure_ascii=False, indent=1)

print(f'estudos processados: {len(registros)}\n')

print('=== PERGUNTA 1: o break-even e sempre o 10o ano? ===')
dist = collections.Counter(r['breakeven'] for r in registros)
for k in sorted(dist, key=lambda v: (v is None, v)):
    print(f'  break-even no ano {k}: {dist[k]} estudos')
print('\n  --- distribuicao por produto ---')
for produto in sorted({r['produto'] for r in registros}):
    sub = [r for r in registros if r['produto'] == produto]
    d = collections.Counter(r['breakeven'] for r in sub)
    resumo = ', '.join(f'ano {k}: {d[k]}' for k in sorted(d, key=lambda v: (v is None, v)))
    print(f'    {produto:28} {resumo}')

sem = [r for r in registros if r['breakeven'] is None]
print(f'\n  --- {len(sem)} estudos sem break-even: extracao falhou ou resgate nunca alcanca? ---')
d = collections.Counter((r["produto"], r["tem_resgate"], r["anos_extraidos"] < 10) for r in sem)
for (p, tem, curto), q in sorted(d.items()):
    print(f'    {p:28} tem_coluna_resgate={tem}  curva_incompleta={curto}  n={q}')

print('\n=== PERGUNTA 2: o resgate no 10o ano depende so da idade atingida? ===')
for produto in sorted({r['produto'] for r in registros}):
    for sexo in ('M', 'F'):
        sub = [r for r in registros
               if r['produto'] == produto and r['sexo'] == sexo and r['resgate_10a']]
        if not sub:
            continue
        razoes = [r['resgate_10a'] / r['aportes_10a'] for r in sub if r['aportes_10a']]
        print(f'  {produto:28} {sexo}  n={len(sub):>2}  '
              f'resgate/aportes no 10o ano: {min(razoes):.4f} a {max(razoes):.4f}')
