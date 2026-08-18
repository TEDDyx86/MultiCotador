# -*- coding: utf-8 -*-
"""Quantifica o erro de fixar o break-even no 10o ano."""
import json, os, collections

AQUI = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(AQUI, 'curvas_resgate.json'), encoding='utf-8'))
d = [r for r in d if r['resgate_10a'] is not None and r['aportes_10a']]

def bloco(registros, titulo):
    print(f'\n=== {titulo}  (n={len(registros)}) ===')
    exato = [r for r in registros if r['breakeven'] == 10]
    perto = [r for r in registros if r['breakeven'] in (9, 11)]
    longe = [r for r in registros if r['breakeven'] is not None
             and abs(r['breakeven'] - 10) >= 2]
    nunca = [r for r in registros if r['breakeven'] is None]
    for rot, g in [('exatamente 10', exato), ('9 ou 11 (erra 1 ano)', perto),
                   ('erra 2+ anos', longe), ('NUNCA faz break-even', nunca)]:
        print(f'  {rot:24} {len(g):>4}  ({len(g) / len(registros) * 100:>5.1f}%)')

    # o que o cliente de fato tem no 10o ano, em % do que aportou
    razoes = sorted(r['resgate_10a'] / r['aportes_10a'] for r in registros)
    print(f'  resgate no 10o ano em % do aportado:')
    print(f'     minimo  {razoes[0] * 100:>6.1f}%')
    print(f'     p10     {razoes[int(len(razoes) * .10)] * 100:>6.1f}%')
    print(f'     mediana {razoes[len(razoes) // 2] * 100:>6.1f}%')
    print(f'     maximo  {razoes[-1] * 100:>6.1f}%')
    ruins = [r for r in razoes if r < 0.95]
    print(f'     casos abaixo de 95% do aportado: {len(ruins)} '
          f'({len(ruins) / len(razoes) * 100:.1f}%)')

bloco(d, 'TODA A BASE (14 a 80 anos)')
bloco([r for r in d if 30 <= r['idade_entrada'] <= 55], 'FAIXA DE VENDA 30-55 ANOS')
bloco([r for r in d if 30 <= r['idade_entrada'] <= 50], 'FAIXA 30-50 ANOS')
bloco([r for r in d if 18 <= r['idade_entrada'] <= 45], 'FAIXA 18-45 ANOS')

print('\n=== onde fixar em 10 quebra: %% do aportado no 10o ano, por idade (homem) ===')
G = collections.defaultdict(dict)
for r in d:
    if r['sexo'] == 'M':
        G[r['produto']][r['idade_entrada']] = r['resgate_10a'] / r['aportes_10a'] * 100
prods = sorted(G)
print(f'{"idade":6}' + ''.join(f'{p.split("_")[0][:10]:>12}' for p in prods))
for i in range(20, 71, 5):
    linha = f'{i:<6}'
    for p in prods:
        v = G[p].get(i)
        linha += f'{v:>11.1f}%' if v else f'{"-":>12}'
    print(linha)
