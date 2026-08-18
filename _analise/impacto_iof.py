# -*- coding: utf-8 -*-
"""Mede quantas vezes o ranking do comparativo muda entre:
   A) numero cru de cada PDF  (MetLife/Prudential com IOF, MAG/Icatu sem)
   B) IOF uniforme            (todos na mesma base)
"""
import csv, os, collections

AQUI = os.path.dirname(os.path.abspath(__file__))
IOF = 0.0038
# produtos do comparativo (os 4 com valor de resgate)
PRODUTOS = {
    'MAG': 'MAG_WL_INTEGRAL_10',
    'MetLife': 'METLIFE_VIDA_TOTAL_10',
    'Prudential': 'PRUDENTIAL_VIDA_INTEIRA_10',
    'Icatu': 'ICATU_HORIZONTE_WL10',
}
# quem ja aparece com IOF embutido no numero cru do estudo
CRU_COM_IOF = {'MetLife', 'Prudential'}

tab = collections.defaultdict(dict)
with open(os.path.join(AQUI, 'tabela_mestre.csv'), encoding='utf-8-sig') as fh:
    for r in csv.DictReader(fh, delimiter=';'):
        tab[(r['produto'], r['sexo'])][int(r['idade'])] = float(r['taxa_anual_por_1mm'])

mudou_ranking = []
mudou_vencedor = []
total = 0
margens = []

for sexo in ('M', 'F'):
    idades = set.intersection(*[set(tab[(p, sexo)]) for p in PRODUTOS.values()])
    for idade in sorted(idades):
        total += 1
        cru, uni = {}, {}
        for nome, prod in PRODUTOS.items():
            base = tab[(prod, sexo)][idade]          # sempre SEM iof
            uni[nome] = base * (1 + IOF)             # uniforme
            cru[nome] = base * (1 + IOF) if nome in CRU_COM_IOF else base
        ord_cru = [k for k, _ in sorted(cru.items(), key=lambda x: x[1])]
        ord_uni = [k for k, _ in sorted(uni.items(), key=lambda x: x[1])]
        if ord_cru != ord_uni:
            mudou_ranking.append((sexo, idade, ord_cru, ord_uni))
            if ord_cru[0] != ord_uni[0]:
                mudou_vencedor.append((sexo, idade, ord_cru[0], ord_uni[0]))
        # margem percentual entre 1o e 2o colocado (base uniforme)
        v = sorted(uni.values())
        margens.append((v[1] - v[0]) / v[0] * 100)

print(f'Cenarios avaliados (sexo x idade): {total}')
print(f'Ranking muda ao padronizar o IOF: {len(mudou_ranking)}')
print(f'O 1o colocado muda:                {len(mudou_vencedor)}')
for s, i, a, b in mudou_ranking:
    print(f'  {"Homem" if s == "M" else "Mulher"} {i} anos')
    print(f'     cru      : {" < ".join(a)}')
    print(f'     uniforme : {" < ".join(b)}')

margens.sort()
print(f'\nMargem entre 1o e 2o colocado:')
print(f'  minima  {margens[0]:.2f}%')
print(f'  mediana {margens[len(margens) // 2]:.2f}%')
print(f'  casos com margem abaixo de 0,38% (tamanho do IOF): '
      f'{sum(1 for m in margens if m < 0.38)}')
print(f'  casos com margem abaixo de 1%: {sum(1 for m in margens if m < 1)}')
