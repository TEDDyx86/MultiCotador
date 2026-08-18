# -*- coding: utf-8 -*-
"""Extrai os casos de referencia dos PDFs ja processados, para o teste de regressao."""
import json, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANALISE = os.path.join(RAIZ, '_analise')

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
# PDF arquivado na pasta errada: e do produto Integral, nao Sucessao
DESCARTAR = {'MAG\\SUCESSÃO HOMEM\\MAG - HOMEM - 63 ANOS.pdf'}

casos = []
for x in json.load(open(os.path.join(ANALISE, 'extraido.json'), encoding='utf-8')):
    chave = (x['seguradora'], x['grupo'])
    if chave not in MAPA or x['arquivo'] in DESCARTAR:
        continue
    # valor que o cliente efetivamente paga, conforme impresso no estudo
    if x['seguradora'] == 'METLIFE':
        esperado = x.get('total_anual')
    elif x['seguradora'] == 'PRUDENTIAL':
        esperado = x.get('anual_c_iof')
    else:
        esperado = x.get('anual')
    if esperado is None or not x.get('capital'):
        continue
    produto, sexo = MAPA[chave]
    casos.append({
        "produtoId": produto, "sexo": sexo, "idade": x['idade_arquivo'],
        "capital": f"{x['capital']:.2f}",
        "premioAnualComIofEsperado": f"{esperado:.2f}",
        "origem": x['arquivo'],
    })

destino = os.path.join(RAIZ, 'dados', 'gabarito.json')
with open(destino, 'w', encoding='utf-8') as fh:
    json.dump(casos, fh, ensure_ascii=False, indent=1)
print(f'gabarito.json: {len(casos)} casos')
