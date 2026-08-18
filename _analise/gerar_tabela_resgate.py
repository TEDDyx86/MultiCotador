# -*- coding: utf-8 -*-
"""
Gera tabela_resgate.csv a partir das curvas extraidas dos PDFs.

Regra de break-even aprovada:
  - idade de entrada ate 55 anos -> fixo no 10o ano
  - acima de 55 anos             -> valor real calculado da curva
    (vazio quando o resgate nunca alcanca os aportes)
"""
import json, os, csv

AQUI = os.path.dirname(os.path.abspath(__file__))
IDADE_CORTE_FIXO = 55

d = json.load(open(os.path.join(AQUI, 'curvas_resgate.json'), encoding='utf-8'))
linhas = []
for r in d:
    if r['resgate_10a'] is None or not r['aportes_10a']:
        continue
    idade = r['idade_entrada']
    if idade <= IDADE_CORTE_FIXO:
        exibido, regra = 10, 'FIXO'
    else:
        exibido, regra = r['breakeven'], 'CALCULADO'
    linhas.append({
        'produto': r['produto'],
        'sexo': r['sexo'],
        'idade_entrada': idade,
        'breakeven_exibido': exibido if exibido is not None else '',
        'breakeven_real': r['breakeven'] if r['breakeven'] is not None else '',
        'regra': regra,
        'resgate_10a_por_1mm': f"{r['resgate_10a']:.2f}",
        'aportes_10a_por_1mm': f"{r['aportes_10a']:.2f}",
        'pct_do_aportado': f"{r['resgate_10a'] / r['aportes_10a'] * 100:.2f}",
    })

linhas.sort(key=lambda x: (x['produto'], x['sexo'], x['idade_entrada']))
saida = os.path.join(AQUI, 'tabela_resgate.csv')
with open(saida, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, fieldnames=list(linhas[0].keys()), delimiter=';')
    w.writeheader(); w.writerows(linhas)

print(f'tabela_resgate.csv: {len(linhas)} linhas')
fixos = [l for l in linhas if l['regra'] == 'FIXO']
calc = [l for l in linhas if l['regra'] == 'CALCULADO']
print(f'  ate {IDADE_CORTE_FIXO} anos (fixo em 10): {len(fixos)}')
print(f'  acima de {IDADE_CORTE_FIXO} (calculado):   {len(calc)}')
print(f'     destes, sem break-even: '
      f'{sum(1 for l in calc if not l["breakeven_exibido"])}')

# quanto o "fixo em 10" diverge da realidade dentro da faixa travada
div = [l for l in fixos if l['breakeven_real'] != 10]
print(f'\n  na faixa fixa, break-even real != 10: {len(div)} casos')
piores = sorted(fixos, key=lambda l: float(l['pct_do_aportado']))[:5]
print('  menores percentuais do aportado dentro da faixa fixa:')
for l in piores:
    print(f'    {l["produto"]:28} {l["sexo"]} {l["idade_entrada"]:>2} anos: '
          f'{l["pct_do_aportado"]}%  (break-even real: {l["breakeven_real"] or "nunca"})')
