# -*- coding: utf-8 -*-
"""
Gera tabela_resgate.csv a partir das curvas extraidas dos PDFs.

Regra de break-even aprovada:
  - idade de entrada ate 55 anos -> fixo no 10o ano
  - acima de 55 anos             -> valor real calculado da curva
    (vazio quando o resgate nunca alcanca os aportes)
"""
import json, os, csv
from decimal import Decimal

AQUI = os.path.dirname(os.path.abspath(__file__))
IDADE_CORTE_FIXO = 55

d = json.load(open(os.path.join(AQUI, 'curvas_resgate.json'), encoding='utf-8'))


def preencher_lacunas(registros):
    """
    Duas tarifas vieram da planilha porque nao existe PDF para elas
    (MetLife Vida Total F/62 e Prudential Vida Inteira M/33). Sem PDF nao ha
    curva de resgate, e a linha entraria no comparativo com R$ 0,00 -- que o
    leitor entende como "este produto nao tem resgate", quando a verdade e
    "faltou o dado". Sao coisas muito diferentes num documento entregue ao
    cliente.

    O valor e derivado da curva canonica, nao estimado: para MetLife e
    Prudential foi verificado que a reserva depois da quitacao depende apenas
    da idade atingida, com 0,0000% de divergencia entre dezenas de estudos.
    O resgate no 10o ano da entrada X e, portanto, o mesmo que aparece na
    idade X+10 de qualquer outro estudo da mesma seguradora.
    """
    import motor

    curva = {}
    with open(os.path.join(AQUI, 'curva_resgate_canonica.csv'), encoding='utf-8-sig') as fh:
        for r in csv.DictReader(fh, delimiter=';'):
            # So aproveita onde a propriedade foi verificada sem divergencia
            if r['dispersao_pct'] == '0.0000':
                curva[(r['produto'], r['sexo'], int(r['idade_atingida']))] = \
                    Decimal(r['resgate_por_1mm'])

    tarifas = motor.carregar()
    existentes = {(r['produto'], r['sexo'], r['idade_entrada']) for r in registros}
    preenchidas = []

    for (produto, sexo, idade) in sorted(tarifas):
        if (produto, sexo, idade) in existentes:
            continue
        resgate = curva.get((produto, sexo, idade + 10))
        if resgate is None:
            continue
        cotacao = motor.cotar(tarifas, produto, sexo, idade, 1_000_000)
        aportes = cotacao.premio_anual_com_iof * 10
        registros.append({
            'produto': produto, 'sexo': sexo, 'idade_entrada': idade,
            # Sem a curva ano a ano so da para afirmar se ja alcancou no 10o ano.
            'breakeven': 10 if resgate >= aportes else None,
            'resgate_10a': float(resgate),
            'aportes_10a': float(aportes),
        })
        preenchidas.append(f'{produto} {sexo} {idade}')

    if preenchidas:
        print('lacunas preenchidas pela curva canonica:')
        for p in preenchidas:
            print(f'  {p}')
        print()
    return registros


d = preencher_lacunas(d)
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
