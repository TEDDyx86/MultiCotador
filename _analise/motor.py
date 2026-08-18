# -*- coding: utf-8 -*-
"""
Motor de calculo do multicotador - implementacao de referencia.

Regras aprovadas:
  1. Premio linear no capital, sem taxa fixa. Aceita qualquer capital, inclusive
     acima de R$ 1.000.000 e com centavos.
  5. Premio mensal = premio anual / 12.
  7. IOF de 0,38% sempre aplicado; o motor devolve o valor com e sem IOF.
  8. Tarifas vindas da tabela mestre (fonte: PDFs dos estudos).
"""
import csv, os
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

AQUI = os.path.dirname(os.path.abspath(__file__))
IOF = Decimal('0.0038')
CAPITAL_BASE = Decimal('1000000')


def brl(v: Decimal) -> Decimal:
    return v.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Tarifa:
    taxa_anual_por_1mm: Decimal
    capital_max: Decimal | None
    fonte: str


@dataclass(frozen=True)
class Cotacao:
    produto: str
    sexo: str
    idade: int
    capital: Decimal
    premio_anual: Decimal
    premio_anual_com_iof: Decimal
    premio_mensal: Decimal
    premio_mensal_com_iof: Decimal
    fonte_tarifa: str


class TabelaIndisponivel(Exception):
    pass


def carregar(caminho=os.path.join(AQUI, 'tabela_mestre.csv')) -> dict:
    tabela = {}
    with open(caminho, encoding='utf-8-sig') as fh:
        for r in csv.DictReader(fh, delimiter=';'):
            tabela[(r['produto'], r['sexo'], int(r['idade']))] = Tarifa(
                taxa_anual_por_1mm=Decimal(r['taxa_anual_por_1mm']),
                capital_max=Decimal(r['capital_max']) if r['capital_max'] else None,
                fonte=r['fonte'],
            )
    return tabela


def cotar(tabela, produto: str, sexo: str, idade: int, capital) -> Cotacao:
    capital = Decimal(str(capital))
    if capital <= 0:
        raise ValueError('capital deve ser positivo')

    tarifa = tabela.get((produto, sexo, idade))
    if tarifa is None:
        raise TabelaIndisponivel(
            f'{produto} nao tem tarifa para sexo {sexo} na idade {idade}')

    if tarifa.capital_max is not None and capital > tarifa.capital_max:
        raise TabelaIndisponivel(
            f'{produto} aceita no maximo R$ {tarifa.capital_max:,.2f} '
            f'de capital aos {idade} anos')

    anual = tarifa.taxa_anual_por_1mm * capital / CAPITAL_BASE
    anual_iof = anual * (1 + IOF)

    return Cotacao(
        produto=produto, sexo=sexo, idade=idade, capital=brl(capital),
        premio_anual=brl(anual),
        premio_anual_com_iof=brl(anual_iof),
        premio_mensal=brl(anual / 12),
        premio_mensal_com_iof=brl(anual_iof / 12),
        fonte_tarifa=tarifa.fonte,
    )


@dataclass(frozen=True)
class LinhaComparativo:
    seguradora: str
    produto: str
    aporte_anual: Decimal
    aporte_acumulado_10a: Decimal
    custo_sobre_capital: Decimal      # em %
    breakeven: int | None             # None = nunca alcanca
    breakeven_regra: str              # FIXO ou CALCULADO
    resgate_10a: Decimal


# Produtos que compoem o comparativo Whole Life (os que possuem valor de resgate).
# MAG Sucessao e MetLife Legado ficam de fora: nao tem resgate, so beneficio prolongado.
COMPARATIVO = {
    'MAG_WL_INTEGRAL_10': 'MAG',
    'METLIFE_VIDA_TOTAL_10': 'MetLife',
    'PRUDENTIAL_VIDA_INTEIRA_10': 'Prudential',
    'ICATU_HORIZONTE_WL10': 'Icatu',
}


def carregar_resgate(caminho=os.path.join(AQUI, 'tabela_resgate.csv')) -> dict:
    dados = {}
    with open(caminho, encoding='utf-8-sig') as fh:
        for r in csv.DictReader(fh, delimiter=';'):
            dados[(r['produto'], r['sexo'], int(r['idade_entrada']))] = {
                'breakeven': int(r['breakeven_exibido']) if r['breakeven_exibido'] else None,
                'regra': r['regra'],
                'resgate_10a_por_1mm': Decimal(r['resgate_10a_por_1mm']),
            }
    return dados


def comparativo(tabela, resgates, sexo: str, idade: int, capital) -> list[LinhaComparativo]:
    """Monta as linhas do relatorio Whole Life 10 anos, ordenadas por aporte anual."""
    capital = Decimal(str(capital))
    linhas = []
    for produto, seguradora in COMPARATIVO.items():
        try:
            c = cotar(tabela, produto, sexo, idade, capital)
        except TabelaIndisponivel:
            continue
        r = resgates.get((produto, sexo, idade))
        acumulado = c.premio_anual_com_iof * 10
        linhas.append(LinhaComparativo(
            seguradora=seguradora, produto=produto,
            aporte_anual=c.premio_anual_com_iof,
            aporte_acumulado_10a=brl(acumulado),
            custo_sobre_capital=(acumulado / capital * 100).quantize(Decimal('0.1')),
            breakeven=r['breakeven'] if r else None,
            breakeven_regra=r['regra'] if r else 'SEM DADO',
            resgate_10a=brl(r['resgate_10a_por_1mm'] * capital / CAPITAL_BASE) if r else Decimal(0),
        ))
    return sorted(linhas, key=lambda l: l.aporte_anual)


def multicotar(tabela, sexo: str, idade: int, capital) -> list[Cotacao]:
    """Cota todos os produtos elegiveis e devolve ordenado do mais barato ao mais caro."""
    produtos = sorted({p for p, s, i in tabela})
    resultado = []
    for produto in produtos:
        try:
            resultado.append(cotar(tabela, produto, sexo, idade, capital))
        except TabelaIndisponivel:
            continue
    return sorted(resultado, key=lambda c: c.premio_anual_com_iof)


def imprimir_comparativo(tabela, resgates, sexo, idade, capital):
    linhas = comparativo(tabela, resgates, sexo, idade, capital)
    perfil = f'{"Masculino" if sexo == "M" else "Feminino"}, {idade} anos'
    print(f'\nANALISE WHOLE LIFE 10 ANOS   |   {perfil}   |   '
          f'Capital R$ {Decimal(str(capital)):,.2f}')
    print(f'  {"":12}{"Aporte Anual":>15}{"Acumulado 10a":>16}{"Custo/CS":>10}'
          f'{"Break-even":>12}{"Resgate 10o ano":>18}')
    for i, l in enumerate(linhas, 1):
        be = f'{l.breakeven}o ano' if l.breakeven else 'nao atinge'
        marca = ' *' if i == 1 else '  '
        print(f'{marca}{l.seguradora:12}{l.aporte_anual:>15,.2f}'
              f'{l.aporte_acumulado_10a:>16,.2f}{l.custo_sobre_capital:>9.1f}%'
              f'{be:>12}{l.resgate_10a:>18,.2f}')
    if len(linhas) > 1:
        preservado = linhas[-1].aporte_acumulado_10a - linhas[0].aporte_acumulado_10a
        print(f'  * recomendada    |    Valor preservado em 10 anos: R$ {preservado:,.2f}')
    regras = {l.breakeven_regra for l in linhas}
    if regras - {'FIXO'}:
        print(f'    (break-even calculado da curva de resgate: idade acima de 55 anos)')


if __name__ == '__main__':
    t = carregar()
    rg = carregar_resgate()
    for sexo, idade, capital in [('M', 50, 1_000_000), ('F', 40, 2_500_000),
                                 ('M', 62, 1_000_000)]:
        imprimir_comparativo(t, rg, sexo, idade, capital)
    print()
