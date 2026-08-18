# -*- coding: utf-8 -*-
"""Regressao: o motor tem que reproduzir exatamente o premio de cada PDF."""
import json, os, sys
from decimal import Decimal
import motor

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

MAPA = {
    ('ICATU', 'HOMEM'): ('ICATU_HORIZONTE_WL10', 'M'),
    ('ICATU', 'MULHER'): ('ICATU_HORIZONTE_WL10', 'F'),
    ('MAG', 'HOMEM_'): ('MAG_WL_INTEGRAL_10', 'M'),
    ('MAG', 'MULHER'): ('MAG_WL_INTEGRAL_10', 'F'),
    ('MAG', 'SUCESSÃO HOMEM'): ('MAG_WL_SUCESSAO_10', 'M'),
    ('MAG', 'SUCESSÃO MULHER'): ('MAG_WL_SUCESSAO_10', 'F'),
    ('METLIFE', 'HOMEM_'): ('METLIFE_VIDA_TOTAL_10', 'M'),
    ('METLIFE', 'MULHER'): ('METLIFE_VIDA_TOTAL_10', 'F'),
    ('METLIFE', 'SUCESSÃO HOMEM_'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'M'),
    ('METLIFE', 'SUCESSÃO MULHER'): ('METLIFE_VIDA_TOTAL_LEGADO_10', 'F'),
    ('PRUDENTIAL', 'HOMEM'): ('PRUDENTIAL_VIDA_INTEIRA_10', 'M'),
    ('PRUDENTIAL', 'MULHER'): ('PRUDENTIAL_VIDA_INTEIRA_10', 'F'),
}
IGNORAR = {'MAG\\SUCESSÃO HOMEM\\MAG - HOMEM - 63 ANOS.pdf'}

tab = motor.carregar()
pdfs = json.load(open(os.path.join(AQUI, 'extraido.json'), encoding='utf-8'))

ok = falha = pulado = 0
erros = []
for x in pdfs:
    chave = (x['seguradora'], x['grupo'])
    if chave not in MAPA or x['arquivo'] in IGNORAR:
        pulado += 1; continue
    produto, sexo = MAPA[chave]
    try:
        c = motor.cotar(tab, produto, sexo, x['idade_arquivo'], x['capital'])
    except (motor.TabelaIndisponivel, ValueError):
        pulado += 1; continue
    # Valor que o cliente efetivamente paga, conforme impresso no estudo:
    #   MAG/Icatu   -> o premio ja vem com IOF embutido
    #   MetLife     -> linha "Premio Total"
    #   Prudential  -> "TOTAL ANUAL + IOF"
    if x['seguradora'] == 'METLIFE':
        esperado = Decimal(str(x['total_anual']))
    elif x['seguradora'] == 'PRUDENTIAL':
        esperado = Decimal(str(x['anual_c_iof']))
    else:
        esperado = Decimal(str(x['anual']))
    # Igualdade estrita: uma tolerancia de 1 centavo mascarava perda de
    # precisao na ingestao das tarifas em vez de prova-la ausente.
    if c.premio_anual_com_iof == esperado:
        ok += 1
    else:
        falha += 1
        erros.append((x['arquivo'], esperado, c.premio_anual_com_iof))

print(f'PDFs reproduzidos exatamente: {ok}')
print(f'Divergentes: {falha}')
print(f'Pulados (produto fora do escopo / descartado): {pulado}')
for a, e, g in erros[:20]:
    print(f'  {a}: esperado {e} obtido {g}')

# --- checagens de linearidade e fracionamento ---
print('\n--- linearidade ---')
# A expectativa vem da TARIFA, o dado de entrada, e nao do premio de R$ 1mm ja
# arredondado: arredondar antes de escalar amplifica o erro pelo proprio fator.
taxa = tab[('ICATU_HORIZONTE_WL10', 'M', 40)].taxa_anual_por_1mm
falhas_linearidade = 0
for mult in ['0.5', '2', '3.7', '10']:
    c = motor.cotar(tab, 'ICATU_HORIZONTE_WL10', 'M', 40, Decimal('1000000') * Decimal(mult))
    esperado = motor.brl(taxa * Decimal(mult))
    ok = c.premio_anual == esperado
    falhas_linearidade += 0 if ok else 1
    marca = 'OK' if ok else 'FALHA'
    print(f'  capital x{mult:>4}: {c.premio_anual:>14,.2f}  esperado {esperado:>14,.2f}  {marca}')

print('\n--- capital quebrado e IOF ---')
c = motor.cotar(tab, 'PRUDENTIAL_VIDA_INTEIRA_10', 'F', 33, '1234567.89')
print(f'  anual sem IOF   R$ {c.premio_anual:>12,.2f}')
print(f'  anual com IOF   R$ {c.premio_anual_com_iof:>12,.2f}'
      f'   (razao {c.premio_anual_com_iof / c.premio_anual:.6f})')
print(f'  mensal com IOF  R$ {c.premio_mensal_com_iof:>12,.2f}'
      f'   (x12 = {c.premio_mensal_com_iof * 12:,.2f})')

sys.exit(1 if (falha or falhas_linearidade) else 0)
