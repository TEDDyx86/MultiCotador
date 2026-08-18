# -*- coding: utf-8 -*-
"""Converte os CSVs validados de _analise/ em JSON para a aplicacao."""
import csv, json, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANALISE = os.path.join(RAIZ, '_analise')
DESTINO = os.path.join(RAIZ, 'dados')
os.makedirs(DESTINO, exist_ok=True)

PRODUTOS = [
    {"id": "ICATU_HORIZONTE_WL10", "seguradoraId": "ICATU", "seguradora": "Icatu",
     "nome": "Vida Horizonte", "codigoSusep": None, "logo": "logo_icatu.png",
     "anosPagamento": 10, "idadeMin": 18, "idadeMax": 75,
     "temResgate": True, "premioJaComIof": True, "entraNoComparativo": True},
    {"id": "MAG_WL_INTEGRAL_10", "seguradoraId": "MAG", "seguradora": "MAG",
     "nome": "Whole Life Integral 10 Anos", "codigoSusep": "3109", "logo": "mag-logo.png",
     "anosPagamento": 10, "idadeMin": 16, "idadeMax": 80,
     "temResgate": True, "premioJaComIof": True, "entraNoComparativo": True},
    {"id": "MAG_WL_SUCESSAO_10", "seguradoraId": "MAG", "seguradora": "MAG",
     "nome": "Whole Life Sucessao 10 Anos", "codigoSusep": "3115", "logo": "mag-logo.png",
     "anosPagamento": 10, "idadeMin": 16, "idadeMax": 80,
     "temResgate": False, "premioJaComIof": True, "entraNoComparativo": False},
    {"id": "METLIFE_VIDA_TOTAL_10", "seguradoraId": "METLIFE", "seguradora": "MetLife",
     "nome": "Vida Total", "codigoSusep": None, "logo": "metlife-logo.png",
     "anosPagamento": 10, "idadeMin": 18, "idadeMax": 75,
     "temResgate": True, "premioJaComIof": False, "entraNoComparativo": True},
    {"id": "METLIFE_VIDA_TOTAL_LEGADO_10", "seguradoraId": "METLIFE", "seguradora": "MetLife",
     "nome": "Vida Total Legado", "codigoSusep": None, "logo": "metlife-logo.png",
     "anosPagamento": 10, "idadeMin": 18, "idadeMax": 70,
     "temResgate": False, "premioJaComIof": False, "entraNoComparativo": False},
    {"id": "PRUDENTIAL_VIDA_INTEIRA_10", "seguradoraId": "PRUDENTIAL", "seguradora": "Prudential",
     "nome": "Vida Inteira", "codigoSusep": None, "logo": "Prudential-Logo.png",
     "anosPagamento": 10, "idadeMin": 14, "idadeMax": 75,
     "temResgate": True, "premioJaComIof": False, "entraNoComparativo": True},
]

SAFRA = {
    "versao": "2026.08",
    "descricao": "Base inicial: estudos coletados entre dez/2025 e jun/2026",
    "geradaEm": "2026-08-18",
}

def escrever(nome, dados):
    caminho = os.path.join(DESTINO, nome)
    with open(caminho, 'w', encoding='utf-8') as fh:
        json.dump(dados, fh, ensure_ascii=False, separators=(',', ':'))
    tamanho = len(dados) if isinstance(dados, list) else 1
    print(f'{nome}: {tamanho} registros')

escrever('produtos.json', PRODUTOS)
escrever('safra.json', SAFRA)

tarifas = []
with open(os.path.join(ANALISE, 'tabela_mestre.csv'), encoding='utf-8-sig') as fh:
    for r in csv.DictReader(fh, delimiter=';'):
        tarifas.append({
            "produtoId": r['produto'],
            "sexo": r['sexo'],
            "idade": int(r['idade']),
            "taxaAnualPor1mm": r['taxa_anual_por_1mm'],
            "capitalMax": r['capital_max'] or None,
            "fonte": r['fonte'],
        })
escrever('tarifas.json', tarifas)

resgates = []
with open(os.path.join(ANALISE, 'tabela_resgate.csv'), encoding='utf-8-sig') as fh:
    for r in csv.DictReader(fh, delimiter=';'):
        resgates.append({
            "produtoId": r['produto'],
            "sexo": r['sexo'],
            "idadeEntrada": int(r['idade_entrada']),
            "breakevenReal": int(r['breakeven_real']) if r['breakeven_real'] else None,
            "resgate10aPor1mm": r['resgate_10a_por_1mm'],
        })
escrever('resgates.json', resgates)
