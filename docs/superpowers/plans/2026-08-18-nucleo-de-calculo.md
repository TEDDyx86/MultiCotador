# Núcleo de Cálculo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o motor de cálculo do multicotador em TypeScript, provado contra os 719 estudos reais das seguradoras.

**Architecture:** Camada de domínio pura (sem I/O) com as regras de negócio, um repositório que lê dados versionados em JSON, e um motor que recebe o repositório por parâmetro. O motor não sabe de onde vêm os dados nem que existe interface gráfica — o que permite testá-lo isolado. Os dados JSON são gerados por script Python a partir dos CSVs já validados em `_analise/`.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Vitest, decimal.js, Python 3 (apenas pipeline, fora do deploy).

---

## Contexto para quem nunca viu este projeto

O sistema compara preços de seguro de vida Whole Life entre quatro seguradoras. Não existe
fórmula de cálculo: **cada seguradora tem sua própria tabela de preço**, extraída dos PDFs
de estudo que ela mesma emite. O trabalho já feito extraiu 722 tarifas desses PDFs e as
validou. Este plano leva essas tabelas para TypeScript.

Vocabulário:
- **Prêmio / aporte** — o que o cliente paga por ano
- **Capital segurado** — o valor da indenização (a base é toda cotada para R$ 1.000.000)
- **Tarifa** — o prêmio anual para R$ 1MM de capital, num produto/sexo/idade
- **IOF** — imposto de 0,38% sobre prêmio de seguro
- **Resgate** — reserva que o cliente pode sacar se cancelar
- **Break-even** — primeiro ano em que o resgate iguala o total já aportado

Três regras que parecem erro mas não são:
1. O prêmio é **linear no capital**, sem taxa fixa. Metade do capital, metade do prêmio.
2. MAG e Icatu publicam o prêmio **já com IOF**; MetLife e Prudential publicam líquido e
   somam o IOF à parte. A base guarda sempre o **líquido** e o motor reaplica o IOF.
3. MAG Sucessão aceita no máximo **R$ 700 mil** de capital a partir dos 78 anos.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `pipeline/gerar_dados.py` | Converte os CSVs de `_analise/` em JSON para a aplicação |
| `pipeline/gerar_gabarito.py` | Extrai os 719 casos de referência para o teste de regressão |
| `dados/produtos.json` | Metadados dos 6 produtos |
| `dados/safra.json` | Versao e data de vigencia da base |
| `dados/tarifas.json` | 722 tarifas |
| `dados/resgates.json` | 484 linhas de resgate e break-even |
| `dados/gabarito.json` | 719 casos esperados (só teste) |
| `lib/dominio/tipos.ts` | Tipos do domínio |
| `lib/dominio/regras.ts` | Constantes e regras puras (IOF, idade, arredondamento) |
| `lib/repositorio/repositorio.ts` | Interface do repositório |
| `lib/repositorio/repositorioJson.ts` | Implementação sobre os JSON |
| `lib/motor/cotacao.ts` | Cotação de um produto |
| `lib/motor/comparativo.ts` | Ranking dos 4 produtos do comparativo |
| `tests/regras.test.ts` | Idade, arredondamento, IOF |
| `tests/cotacao.test.ts` | Linearidade, elegibilidade, teto de capital |
| `tests/regressao.test.ts` | Os 719 casos reais |
| `tests/comparativo.test.ts` | Caso John Daniel campo a campo |

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1: Criar o projeto Next.js**

Rodar na raiz do repositório (`C:/Users/Administrator/Documents/GitHub/Multicotador`):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint --use-npm
```

Quando perguntar sobre sobrescrever arquivos existentes, aceitar. Os arquivos de dados
(`ESTUDOS POR IDADE/`, `_analise/`, `docs/`, PNGs) não são tocados pelo gerador.

- [ ] **Step 2: Instalar as dependências do núcleo**

```bash
npm install decimal.js
npm install -D vitest @vitest/coverage-v8 tsx
```

- [ ] **Step 3: Configurar o Vitest**

Criar `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Adicionar os scripts ao package.json**

No campo `"scripts"` do `package.json`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest",
"dados": "python pipeline/gerar_dados.py && python pipeline/gerar_gabarito.py"
```

- [ ] **Step 5: Proteger segredos no .gitignore**

Acrescentar ao final do `.gitignore`:

```
# segredos
.env
.env.local
.env*.local

# artefatos do pipeline
_analise/__pycache__/
```

- [ ] **Step 6: Criar o .env.example**

Criar `.env.example` (este arquivo VAI para o git, com valores vazios):

```
# Hash scrypt da senha de acesso. Gerar com: npx tsx scripts/gerar-hash.ts <senha>
APP_SENHA_HASH=

# Chave aleatoria de 32 bytes para assinar o cookie de sessao.
# Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
APP_SESSAO_SEGREDO=
```

- [ ] **Step 7: Verificar que o projeto sobe**

```bash
npm run test
```

Esperado: Vitest roda e informa "No test files found". Isso confirma a configuração.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js com Vitest e decimal.js"
```

---

### Task 2: Gerar os dados JSON

**Files:**
- Create: `pipeline/gerar_dados.py`
- Create: `dados/produtos.json`, `dados/safra.json`, `dados/tarifas.json`, `dados/resgates.json`

- [ ] **Step 1: Escrever o gerador**

Criar `pipeline/gerar_dados.py`:

```python
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
```

Nota: os valores decimais viajam como **string**, não como número. JSON usa float de dupla
precisão, que não representa decimais exatamente — `0.1 + 0.2` dá `0.30000000000000004`.
Como estamos lidando com dinheiro, o valor precisa chegar ao `Decimal` sem passar por float.

- [ ] **Step 2: Rodar o gerador**

```bash
python pipeline/gerar_dados.py
```

Esperado:
```
produtos.json: 6 registros
safra.json: 1 registros
tarifas.json: 722 registros
resgates.json: 484 registros
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/gerar_dados.py dados/
git commit -m "feat(dados): gera JSON de produtos, tarifas e resgates"
```

---

### Task 3: Gerar o gabarito de regressão

**Files:**
- Create: `pipeline/gerar_gabarito.py`
- Create: `dados/gabarito.json`

O gabarito é a lista dos 719 estudos reais com o valor que cada um imprime. É contra ele
que o motor TypeScript será verificado.

- [ ] **Step 1: Escrever o gerador**

Criar `pipeline/gerar_gabarito.py`:

```python
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
```

- [ ] **Step 2: Rodar e conferir a contagem**

```bash
python pipeline/gerar_gabarito.py
```

Esperado: `gabarito.json: 719 casos`

Se sair número diferente de 719, parar e investigar antes de seguir — o gabarito é a
única prova de que o porte para TypeScript está correto.

- [ ] **Step 3: Commit**

```bash
git add pipeline/gerar_gabarito.py dados/gabarito.json
git commit -m "test(dados): gabarito com os 719 casos de referencia"
```

---

### Task 4: Tipos e regras do domínio

**Files:**
- Create: `lib/dominio/tipos.ts`
- Create: `lib/dominio/regras.ts`
- Test: `tests/regras.test.ts`

- [ ] **Step 1: Escrever os testes das regras puras**

Criar `tests/regras.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { IOF, brl, aplicarIof, idadeEm } from '@/lib/dominio/regras'

describe('arredondamento monetario', () => {
  it('arredonda meio centavo para cima', () => {
    expect(brl(new Decimal('1.005')).toString()).toBe('1.01')
  })

  it('mantem duas casas', () => {
    expect(brl(new Decimal('45265.2')).toFixed(2)).toBe('45265.20')
  })
})

describe('IOF', () => {
  it('e de 0,38 por cento', () => {
    expect(IOF.toString()).toBe('0.0038')
  })

  it('aplica sobre o premio liquido', () => {
    const comIof = aplicarIof(new Decimal('45093.84'))
    expect(brl(comIof).toFixed(2)).toBe('45265.20')
  })
})

describe('idade', () => {
  it('conta anos completos na data da simulacao', () => {
    expect(idadeEm(new Date('1986-01-01'), new Date('2026-01-14'))).toBe(40)
  })

  it('nao conta o ano quando o aniversario ainda nao chegou', () => {
    expect(idadeEm(new Date('1986-06-15'), new Date('2026-01-14'))).toBe(39)
  })

  it('conta o ano no dia exato do aniversario', () => {
    expect(idadeEm(new Date('1986-01-14'), new Date('2026-01-14'))).toBe(40)
  })
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
npm run test -- tests/regras.test.ts
```

Esperado: FAIL — não consegue resolver `@/lib/dominio/regras`.

- [ ] **Step 3: Escrever os tipos**

Criar `lib/dominio/tipos.ts`:

```typescript
import type Decimal from 'decimal.js'

export type Sexo = 'M' | 'F'
export type FonteTarifa = 'PDF' | 'XLSX' | 'ESTIMADO'

export interface Produto {
  id: string
  seguradoraId: string
  seguradora: string
  nome: string
  codigoSusep: string | null
  logo: string
  anosPagamento: number
  idadeMin: number
  idadeMax: number
  temResgate: boolean
  premioJaComIof: boolean
  entraNoComparativo: boolean
}

export interface Tarifa {
  produtoId: string
  sexo: Sexo
  idade: number
  /** Premio anual LIQUIDO (sem IOF) para R$ 1.000.000 de capital. */
  taxaAnualPor1mm: Decimal
  /** Teto de capital nesta idade. Nulo quando nao ha limite. */
  capitalMax: Decimal | null
  fonte: FonteTarifa
}

export interface Resgate {
  produtoId: string
  sexo: Sexo
  idadeEntrada: number
  /** Primeiro ano em que o resgate alcanca o aportado. Nulo = nunca alcanca. */
  breakevenReal: number | null
  resgate10aPor1mm: Decimal
}

export interface Cotacao {
  produto: Produto
  sexo: Sexo
  idade: number
  capital: Decimal
  premioAnual: Decimal
  premioAnualComIof: Decimal
  premioMensal: Decimal
  premioMensalComIof: Decimal
  fonteTarifa: FonteTarifa
}

export interface DadosCliente {
  nome: string
  sexo: Sexo
  dataNascimento: Date
  estadoCivil: string
  regimeBens: string | null
  profissao: string
}
```

- [ ] **Step 4: Escrever as regras**

Criar `lib/dominio/regras.ts`:

```typescript
import Decimal from 'decimal.js'

/** Aliquota de IOF sobre premio de seguro de pessoas. */
export const IOF = new Decimal('0.0038')

/** Capital de referencia das tabelas de tarifa. */
export const CAPITAL_BASE = new Decimal('1000000')

/** Ano em que o comparativo apresenta o break-even, por decisao de negocio. */
export const BREAKEVEN_DOCUMENTO = 10

/** Arredonda para centavos, meio para cima — como faz o mercado financeiro. */
export function brl(valor: Decimal): Decimal {
  return valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

export function aplicarIof(premioLiquido: Decimal): Decimal {
  return premioLiquido.times(IOF.plus(1))
}

/** Anos completos entre as duas datas. */
export function idadeEm(nascimento: Date, referencia: Date): number {
  let anos = referencia.getFullYear() - nascimento.getFullYear()
  const mes = referencia.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) {
    anos -= 1
  }
  return anos
}
```

- [ ] **Step 5: Rodar os testes**

```bash
npm run test -- tests/regras.test.ts
```

Esperado: PASS, 7 testes.

- [ ] **Step 6: Commit**

```bash
git add lib/dominio tests/regras.test.ts
git commit -m "feat(dominio): tipos e regras de IOF, arredondamento e idade"
```

---

### Task 5: Repositório

**Files:**
- Create: `lib/repositorio/repositorio.ts`
- Create: `lib/repositorio/repositorioJson.ts`

O repositório isola de onde vêm os dados. Hoje lê JSON; amanhã pode ler banco, sem que o
motor perceba.

- [ ] **Step 1: Escrever a interface**

Criar `lib/repositorio/repositorio.ts`:

```typescript
import type { Produto, Resgate, Sexo, Tarifa } from '@/lib/dominio/tipos'

export interface Repositorio {
  produtos(): Produto[]
  produto(id: string): Produto | undefined
  tarifa(produtoId: string, sexo: Sexo, idade: number): Tarifa | undefined
  resgate(produtoId: string, sexo: Sexo, idadeEntrada: number): Resgate | undefined
}
```

- [ ] **Step 2: Escrever a implementação sobre JSON**

Criar `lib/repositorio/repositorioJson.ts`:

```typescript
import Decimal from 'decimal.js'
import produtosJson from '@/dados/produtos.json'
import tarifasJson from '@/dados/tarifas.json'
import resgatesJson from '@/dados/resgates.json'
import type { Produto, Resgate, Sexo, Tarifa, FonteTarifa } from '@/lib/dominio/tipos'
import type { Repositorio } from './repositorio'

const PRODUTOS = produtosJson as Produto[]

const PRODUTOS_POR_ID = new Map(PRODUTOS.map((p) => [p.id, p]))

function chave(produtoId: string, sexo: Sexo, idade: number): string {
  return `${produtoId}|${sexo}|${idade}`
}

const TARIFAS = new Map<string, Tarifa>(
  (tarifasJson as Array<Record<string, string | number | null>>).map((t) => {
    const tarifa: Tarifa = {
      produtoId: t.produtoId as string,
      sexo: t.sexo as Sexo,
      idade: t.idade as number,
      taxaAnualPor1mm: new Decimal(t.taxaAnualPor1mm as string),
      capitalMax: t.capitalMax ? new Decimal(t.capitalMax as string) : null,
      fonte: t.fonte as FonteTarifa,
    }
    return [chave(tarifa.produtoId, tarifa.sexo, tarifa.idade), tarifa]
  }),
)

const RESGATES = new Map<string, Resgate>(
  (resgatesJson as Array<Record<string, string | number | null>>).map((r) => {
    const resgate: Resgate = {
      produtoId: r.produtoId as string,
      sexo: r.sexo as Sexo,
      idadeEntrada: r.idadeEntrada as number,
      breakevenReal: (r.breakevenReal as number | null) ?? null,
      resgate10aPor1mm: new Decimal(r.resgate10aPor1mm as string),
    }
    return [chave(resgate.produtoId, resgate.sexo, resgate.idadeEntrada), resgate]
  }),
)

export const repositorioJson: Repositorio = {
  produtos: () => PRODUTOS,
  produto: (id) => PRODUTOS_POR_ID.get(id),
  tarifa: (produtoId, sexo, idade) => TARIFAS.get(chave(produtoId, sexo, idade)),
  resgate: (produtoId, sexo, idade) => RESGATES.get(chave(produtoId, sexo, idade)),
}
```

- [ ] **Step 3: Habilitar import de JSON no TypeScript**

Em `tsconfig.json`, dentro de `compilerOptions`, garantir:

```json
"resolveJsonModule": true
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

Esperado: nenhum erro.

- [ ] **Step 5: Commit**

```bash
git add lib/repositorio tsconfig.json
git commit -m "feat(repositorio): leitura de tarifas e resgates a partir de JSON"
```

---

### Task 6: Motor de cotação

**Files:**
- Create: `lib/motor/cotacao.ts`
- Test: `tests/cotacao.test.ts`

- [ ] **Step 1: Escrever os testes**

Criar `tests/cotacao.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { cotar, TarifaIndisponivel } from '@/lib/motor/cotacao'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'

describe('cotacao basica', () => {
  it('reproduz o estudo da MAG para homem de 40 anos', () => {
    const c = cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('1000000'))
    expect(c.premioAnualComIof.toFixed(2)).toBe('45265.20')
  })

  it('calcula o mensal dividindo o anual por doze', () => {
    const c = cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('1000000'))
    expect(c.premioMensalComIof.toFixed(2)).toBe('3772.10')
  })
})

describe('linearidade do capital', () => {
  const base = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, new Decimal('1000000'))

  it.each(['0.5', '2', '3.7', '10'])('escala proporcionalmente com fator %s', (fator) => {
    const capital = new Decimal('1000000').times(fator)
    const c = cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 40, capital)
    const esperado = base.premioAnual.times(fator).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    expect(c.premioAnual.toFixed(2)).toBe(esperado.toFixed(2))
  })

  it('aceita capital com centavos', () => {
    const c = cotar(repo, 'PRUDENTIAL_VIDA_INTEIRA_10', 'F', 33, new Decimal('1234567.89'))
    expect(c.premioAnualComIof.dividedBy(c.premioAnual).toFixed(6)).toBe('1.003800')
  })
})

describe('elegibilidade', () => {
  it('recusa idade fora da faixa do produto', () => {
    expect(() => cotar(repo, 'ICATU_HORIZONTE_WL10', 'M', 79, new Decimal('1000000')))
      .toThrow(TarifaIndisponivel)
  })

  it('respeita o teto de capital da MAG Sucessao aos 79 anos', () => {
    expect(() => cotar(repo, 'MAG_WL_SUCESSAO_10', 'M', 79, new Decimal('1000000')))
      .toThrow(/700/)
  })

  it('aceita capital dentro do teto', () => {
    const c = cotar(repo, 'MAG_WL_SUCESSAO_10', 'M', 79, new Decimal('700000'))
    expect(c.premioAnualComIof.toFixed(2)).toBe('59090.95')
  })

  it('recusa capital zero ou negativo', () => {
    expect(() => cotar(repo, 'MAG_WL_INTEGRAL_10', 'M', 40, new Decimal('0')))
      .toThrow(/positivo/)
  })
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
npm run test -- tests/cotacao.test.ts
```

Esperado: FAIL — não consegue resolver `@/lib/motor/cotacao`.

- [ ] **Step 3: Implementar o motor**

Criar `lib/motor/cotacao.ts`:

```typescript
import Decimal from 'decimal.js'
import { CAPITAL_BASE, aplicarIof, brl } from '@/lib/dominio/regras'
import type { Cotacao, Sexo } from '@/lib/dominio/tipos'
import type { Repositorio } from '@/lib/repositorio/repositorio'

export class TarifaIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'TarifaIndisponivel'
  }
}

function formatarBrl(valor: Decimal): string {
  return valor.toNumber().toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function cotar(
  repo: Repositorio,
  produtoId: string,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): Cotacao {
  if (capital.lessThanOrEqualTo(0)) {
    throw new TarifaIndisponivel('O capital segurado deve ser positivo.')
  }

  const produto = repo.produto(produtoId)
  if (!produto) {
    throw new TarifaIndisponivel(`Produto desconhecido: ${produtoId}`)
  }

  const tarifa = repo.tarifa(produtoId, sexo, idade)
  if (!tarifa) {
    throw new TarifaIndisponivel(
      `${produto.nome} nao esta disponivel aos ${idade} anos ` +
        `(faixa de ${produto.idadeMin} a ${produto.idadeMax}).`,
    )
  }

  if (tarifa.capitalMax && capital.greaterThan(tarifa.capitalMax)) {
    throw new TarifaIndisponivel(
      `${produto.nome} aceita no maximo ${formatarBrl(tarifa.capitalMax)} ` +
        `de capital aos ${idade} anos.`,
    )
  }

  // O premio escala linearmente com o capital, sem taxa fixa de apolice.
  const anual = tarifa.taxaAnualPor1mm.times(capital).dividedBy(CAPITAL_BASE)
  const anualComIof = aplicarIof(anual)

  // Arredondar so na saida: arredondar antes propagaria erro para o mensal.
  return {
    produto,
    sexo,
    idade,
    capital: brl(capital),
    premioAnual: brl(anual),
    premioAnualComIof: brl(anualComIof),
    premioMensal: brl(anual.dividedBy(12)),
    premioMensalComIof: brl(anualComIof.dividedBy(12)),
    fonteTarifa: tarifa.fonte,
  }
}

/** Cota todos os produtos elegiveis, do mais barato ao mais caro. */
export function multicotar(
  repo: Repositorio,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): { cotacoes: Cotacao[]; indisponiveis: Array<{ produtoId: string; motivo: string }> } {
  const cotacoes: Cotacao[] = []
  const indisponiveis: Array<{ produtoId: string; motivo: string }> = []

  for (const produto of repo.produtos()) {
    try {
      cotacoes.push(cotar(repo, produto.id, sexo, idade, capital))
    } catch (erro) {
      if (erro instanceof TarifaIndisponivel) {
        indisponiveis.push({ produtoId: produto.id, motivo: erro.message })
      } else {
        throw erro
      }
    }
  }

  cotacoes.sort((a, b) => a.premioAnualComIof.comparedTo(b.premioAnualComIof))
  return { cotacoes, indisponiveis }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npm run test -- tests/cotacao.test.ts
```

Esperado: PASS, 11 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/motor/cotacao.ts tests/cotacao.test.ts
git commit -m "feat(motor): cotacao com linearidade, IOF, elegibilidade e teto de capital"
```

---

### Task 7: Regressão contra os 719 estudos

**Files:**
- Test: `tests/regressao.test.ts`

Esta é a tarefa mais importante do plano. Ela prova que o motor TypeScript calcula
exatamente como as seguradoras calculam.

- [ ] **Step 1: Escrever o teste**

Criar `tests/regressao.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import gabarito from '@/dados/gabarito.json'
import { cotar } from '@/lib/motor/cotacao'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'
import type { Sexo } from '@/lib/dominio/tipos'

interface CasoGabarito {
  produtoId: string
  sexo: string
  idade: number
  capital: string
  premioAnualComIofEsperado: string
  origem: string
}

const CASOS = gabarito as CasoGabarito[]

describe('regressao contra os estudos reais das seguradoras', () => {
  it('o gabarito tem os 719 casos esperados', () => {
    expect(CASOS.length).toBe(719)
  })

  it('reproduz todos os estudos com centavo exato', () => {
    const divergentes: string[] = []

    for (const caso of CASOS) {
      const c = cotar(
        repo,
        caso.produtoId,
        caso.sexo as Sexo,
        caso.idade,
        new Decimal(caso.capital),
      )
      const obtido = c.premioAnualComIof.toFixed(2)
      const esperado = new Decimal(caso.premioAnualComIofEsperado).toFixed(2)
      if (obtido !== esperado) {
        divergentes.push(`${caso.origem}: esperado ${esperado}, obtido ${obtido}`)
      }
    }

    expect(divergentes).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar o teste**

```bash
npm run test -- tests/regressao.test.ts
```

Esperado: PASS, 2 testes.

Se algum caso divergir, a mensagem aponta o PDF de origem. As causas prováveis, em ordem:
1. Arredondamento aplicado antes da hora (arredondar `anual` antes de aplicar o IOF)
2. Valor decimal lido como número em vez de string em algum ponto
3. Tarifa faltando ou trocada no `tarifas.json`

- [ ] **Step 3: Commit**

```bash
git add tests/regressao.test.ts
git commit -m "test(motor): regressao contra os 719 estudos reais"
```

---

### Task 8: Comparativo

**Files:**
- Create: `lib/motor/comparativo.ts`
- Test: `tests/comparativo.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `tests/comparativo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { montarComparativo } from '@/lib/motor/comparativo'
import { repositorioJson as repo } from '@/lib/repositorio/repositorioJson'

describe('comparativo — caso de referencia John Daniel', () => {
  const r = montarComparativo(repo, 'M', 50, new Decimal('1000000'))

  it('traz as quatro seguradoras do comparativo', () => {
    expect(r.linhas.map((l) => l.seguradora)).toEqual([
      'MAG', 'MetLife', 'Prudential', 'Icatu',
    ])
  })

  it('reproduz os aportes anuais do documento', () => {
    expect(r.linhas.map((l) => l.aporteAnual.toFixed(2))).toEqual([
      '57248.94', '59922.68', '60542.49', '63053.16',
    ])
  })

  it('reproduz os aportes acumulados em dez anos', () => {
    expect(r.linhas.map((l) => l.aporteAcumulado10a.toFixed(2))).toEqual([
      '572489.40', '599226.80', '605424.90', '630531.60',
    ])
  })

  it('reproduz o custo sobre o capital segurado', () => {
    expect(r.linhas.map((l) => l.custoSobreCapital.toFixed(1))).toEqual([
      '57.2', '59.9', '60.5', '63.1',
    ])
  })

  it('reproduz os valores de resgate no decimo ano', () => {
    expect(r.linhas.map((l) => l.resgate10a.toFixed(2))).toEqual([
      '574354.16', '606160.60', '613200.00', '630531.65',
    ])
  })

  it('reproduz o valor preservado em dez anos', () => {
    expect(r.valorPreservado.toFixed(2)).toBe('58042.20')
  })

  it('apresenta sempre o decimo ano como break-even no documento', () => {
    expect(r.linhas.every((l) => l.breakevenDocumento === 10)).toBe(true)
  })
})

describe('comparativo — informacao interna para o corretor', () => {
  it('expoe o break-even real, que difere do documento acima de 55 anos', () => {
    const r = montarComparativo(repo, 'M', 62, new Decimal('1000000'))
    const mag = r.linhas.find((l) => l.seguradora === 'MAG')!
    expect(mag.breakevenDocumento).toBe(10)
    expect(mag.breakevenReal).toBeNull()
  })

  it('marca que o resgate nao alcanca o aportado quando e o caso', () => {
    const r = montarComparativo(repo, 'M', 62, new Decimal('1000000'))
    const mag = r.linhas.find((l) => l.seguradora === 'MAG')!
    expect(mag.resgate10a.lessThan(mag.aporteAcumulado10a)).toBe(true)
  })
})

describe('comparativo — escala com o capital', () => {
  it('dobra os valores quando o capital dobra', () => {
    const um = montarComparativo(repo, 'F', 40, new Decimal('1000000'))
    const dois = montarComparativo(repo, 'F', 40, new Decimal('2000000'))
    expect(dois.linhas[0].aporteAnual.toFixed(2))
      .toBe(um.linhas[0].aporteAnual.times(2).toFixed(2))
  })
})
```

- [ ] **Step 2: Rodar e verificar que falha**

```bash
npm run test -- tests/comparativo.test.ts
```

Esperado: FAIL — não consegue resolver `@/lib/motor/comparativo`.

- [ ] **Step 3: Implementar o comparativo**

Criar `lib/motor/comparativo.ts`:

```typescript
import Decimal from 'decimal.js'
import { BREAKEVEN_DOCUMENTO, CAPITAL_BASE, brl } from '@/lib/dominio/regras'
import type { FonteTarifa, Sexo } from '@/lib/dominio/tipos'
import type { Repositorio } from '@/lib/repositorio/repositorio'
import { TarifaIndisponivel, cotar } from './cotacao'

export interface LinhaComparativo {
  produtoId: string
  seguradora: string
  logo: string
  aporteAnual: Decimal
  aporteAcumulado10a: Decimal
  /** Percentual do capital segurado. */
  custoSobreCapital: Decimal
  /** O que o documento apresenta: sempre o decimo ano, por decisao de negocio. */
  breakevenDocumento: number
  /** O ano em que o resgate realmente alcanca o aportado. Nulo = nunca alcanca. */
  breakevenReal: number | null
  resgate10a: Decimal
  fonteTarifa: FonteTarifa
}

export interface Comparativo {
  linhas: LinhaComparativo[]
  /** Diferenca acumulada entre a opcao mais cara e a recomendada. */
  valorPreservado: Decimal
  indisponiveis: Array<{ produtoId: string; motivo: string }>
}

export function montarComparativo(
  repo: Repositorio,
  sexo: Sexo,
  idade: number,
  capital: Decimal,
): Comparativo {
  const linhas: LinhaComparativo[] = []
  const indisponiveis: Array<{ produtoId: string; motivo: string }> = []

  for (const produto of repo.produtos()) {
    if (!produto.entraNoComparativo) continue

    let cotacao
    try {
      cotacao = cotar(repo, produto.id, sexo, idade, capital)
    } catch (erro) {
      if (erro instanceof TarifaIndisponivel) {
        indisponiveis.push({ produtoId: produto.id, motivo: erro.message })
        continue
      }
      throw erro
    }

    const resgate = repo.resgate(produto.id, sexo, idade)
    const acumulado = cotacao.premioAnualComIof.times(10)

    linhas.push({
      produtoId: produto.id,
      seguradora: produto.seguradora,
      logo: produto.logo,
      aporteAnual: cotacao.premioAnualComIof,
      aporteAcumulado10a: brl(acumulado),
      custoSobreCapital: acumulado
        .dividedBy(capital)
        .times(100)
        .toDecimalPlaces(1, Decimal.ROUND_HALF_UP),
      breakevenDocumento: BREAKEVEN_DOCUMENTO,
      breakevenReal: resgate ? resgate.breakevenReal : null,
      resgate10a: resgate
        ? brl(resgate.resgate10aPor1mm.times(capital).dividedBy(CAPITAL_BASE))
        : new Decimal(0),
      fonteTarifa: cotacao.fonteTarifa,
    })
  }

  linhas.sort((a, b) => a.aporteAnual.comparedTo(b.aporteAnual))

  const valorPreservado =
    linhas.length > 1
      ? brl(linhas[linhas.length - 1].aporteAcumulado10a.minus(linhas[0].aporteAcumulado10a))
      : new Decimal(0)

  return { linhas, valorPreservado, indisponiveis }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npm run test -- tests/comparativo.test.ts
```

Esperado: PASS, 10 testes.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
npm run test
```

Esperado: PASS em todos os arquivos — 30 testes no total.

- [ ] **Step 6: Commit**

```bash
git add lib/motor/comparativo.ts tests/comparativo.test.ts
git commit -m "feat(motor): comparativo com ranking, custo e valor preservado"
```

---

### Task 9: Excluir o pipeline do deploy

**Files:**
- Create: `.vercelignore`

Os PDFs das seguradoras e o pipeline Python pesam centenas de megabytes e não têm função
em produção. Sem isso o deploy fica lento e pode estourar limite.

- [ ] **Step 1: Criar o .vercelignore**

Criar `.vercelignore`:

```
ESTUDOS POR IDADE/
_analise/
pipeline/
docs/
tests/
*.pdf
```

Nota: `dados/*.json` **não** entra aqui — são eles que a aplicação usa em produção.
`dados/gabarito.json` só é lido por teste, mas é pequeno e sai junto sem prejuízo.

- [ ] **Step 2: Conferir o que iria para o deploy**

```bash
npx vercel build --prod 2>&1 | tail -20
```

Esperado: build conclui. Se ainda não houver projeto Vercel configurado, pular esta
verificação — ela será feita na fase de deploy.

- [ ] **Step 3: Commit**

```bash
git add .vercelignore
git commit -m "chore: exclui PDFs e pipeline do deploy"
```

---

## Verificação final da fase

- [ ] `npm run test` passa com 30 testes
- [ ] `npx tsc --noEmit` sem erros
- [ ] `dados/tarifas.json` tem 722 registros, `resgates.json` 484, `gabarito.json` 719
- [ ] Os 719 casos reproduzem os estudos reais com centavo exato

Ao final desta fase existe um motor de cálculo funcionando e provado, pronto para receber
interface. Nenhuma tela ainda.

---

## Próximas fases

Cada uma terá seu próprio plano, escrito depois que esta fase estiver verde:

**Fase 2 — Autenticação e aplicação web.** Middleware com senha em variável de ambiente
(hash scrypt, cookie assinado, `timingSafeEqual`), formulário de cliente, tela de
resultado com o tema cofre e as animações.

**Fase 3 — PDF e deploy.** Template HTML fiel ao modelo com as fontes TeX Gyre Heros e
DejaVu Serif Italic embutidas, geração via `puppeteer-core` + `@sparticuz/chromium`, e
deploy na Vercel.
