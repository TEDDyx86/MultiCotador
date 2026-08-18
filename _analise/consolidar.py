# -*- coding: utf-8 -*-
"""Gera a tabela unificada de premios (fonte da verdade = PDFs) e um relatorio de qualidade."""
import json, os, csv, collections

AQUI = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(AQUI, 'extraido.json'), encoding='utf-8'))

# Mapeia pasta -> (produto_canonico, sexo)
MAPA = {
    ('ICATU', 'HOMEM'):            ('ICATU_HORIZONTE_WL10', 'M'),
    ('ICATU', 'MULHER'):           ('ICATU_HORIZONTE_WL10', 'F'),
    ('MAG', 'HOMEM_'):             ('MAG_WL_INTEGRAL_10', 'M'),
    ('MAG', 'MULHER'):             ('MAG_WL_INTEGRAL_10', 'F'),
    ('MAG', 'H 12.05.2026'):       ('MAG_WL_INTEGRAL_10__REEMISSAO', 'M'),
    ('MAG', 'SUCESSÃO HOMEM'):     ('MAG_WL_SUCESSAO_10', 'M'),
    ('MAG', 'SUCESSÃO MULHER'):    ('MAG_WL_SUCESSAO_10', 'F'),
    ('METLIFE', 'HOMEM_'):         ('METLIFE_VIDA_TOTAL_10', 'M'),
    ('METLIFE', 'MULHER'):         ('METLIFE_VIDA_TOTAL_10', 'F'),
    ('METLIFE', 'SUCESSÃO HOMEM_'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'M'),
    ('METLIFE', 'SUCESSÃO MULHER'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'F'),
    ('PRUDENTIAL', 'HOMEM'):       ('PRUDENTIAL_VIDA_INTEIRA_10', 'M'),
    ('PRUDENTIAL', 'MULHER'):      ('PRUDENTIAL_VIDA_INTEIRA_10', 'F'),
}
# Seguradoras cujo premio impresso JA inclui IOF ou nao o destaca
IOF_DESTACADO = {'METLIFE', 'PRUDENTIAL'}

linhas = []
for x in d:
    chave = (x['seguradora'], x['grupo'])
    if chave not in MAPA:
        continue
    produto, sexo = MAPA[chave]
    anual = x.get('anual')
    if x['seguradora'] == 'METLIFE':
        anual_c_iof = x.get('total_anual')
    elif x['seguradora'] == 'PRUDENTIAL':
        anual_c_iof = x.get('anual_c_iof')
    else:
        anual_c_iof = None
    linhas.append({
        'seguradora': x['seguradora'],
        'produto': produto,
        'produto_pdf': x.get('produto'),
        'sexo': sexo,
        'idade': x['idade_arquivo'],
        'capital': x.get('capital'),
        'premio_anual_sem_iof': anual,
        'premio_anual_com_iof': anual_c_iof,
        'premio_mensal': x.get('mensal'),
        'anos_pagamento': x.get('pgto_anos'),
        'data_cotacao': x.get('data'),
        'arquivo': x['arquivo'],
    })

linhas.sort(key=lambda r: (r['produto'], r['sexo'], r['idade']))
saida = os.path.join(AQUI, 'tarifas_consolidadas.csv')
with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(linhas[0].keys()), delimiter=';')
    w.writeheader(); w.writerows(linhas)
print('CSV gerado:', saida, len(linhas), 'linhas')

# ---------- relatorio de qualidade ----------
print('\n=== COBERTURA POR PRODUTO/SEXO ===')
grp = collections.defaultdict(dict)
for r in linhas:
    grp[(r['produto'], r['sexo'])][r['idade']] = r
for k in sorted(grp):
    idades = sorted(grp[k])
    buracos = [i for i in range(idades[0], idades[-1] + 1) if i not in grp[k]]
    print(f'{k[0]:32} {k[1]}  {idades[0]:>2}-{idades[-1]:>2}  n={len(idades):>2}  lacunas={buracos or "-"}')

print('\n=== RAZAO PREMIO MULHER / HOMEM (por produto) ===')
prods = sorted({r['produto'] for r in linhas})
for p in prods:
    h, f = grp.get((p, 'M'), {}), grp.get((p, 'F'), {})
    comuns = sorted(set(h) & set(f))
    if not comuns: continue
    rs = [f[i]['premio_anual_sem_iof'] / h[i]['premio_anual_sem_iof'] for i in comuns
          if h[i]['capital'] == f[i]['capital']]
    print(f'{p:32} min={min(rs):.3f} max={max(rs):.3f} media={sum(rs)/len(rs):.3f}')

print('\n=== ALERTAS DE QUALIDADE ===')
for k in sorted(grp):
    idades = sorted(grp[k])
    for a, b in zip(idades, idades[1:]):
        ra, rb = grp[k][a], grp[k][b]
        if ra['capital'] != rb['capital']:
            print(f'  [capital muda] {k[0]} {k[1]} idade {a}->{b}: {ra["capital"]:.0f} -> {rb["capital"]:.0f}')
            continue
        if rb['premio_anual_sem_iof'] <= ra['premio_anual_sem_iof']:
            print(f'  [nao-monotonico] {k[0]} {k[1]} idade {a}->{b}: '
                  f'{ra["premio_anual_sem_iof"]:.2f} -> {rb["premio_anual_sem_iof"]:.2f}')
for r in linhas:
    if r['produto'].startswith('MAG_WL_SUCESSAO') and 'SUCESS' not in (r['produto_pdf'] or ''):
        print(f'  [produto divergente] {r["arquivo"]} -> PDF diz "{r["produto_pdf"]}"')
